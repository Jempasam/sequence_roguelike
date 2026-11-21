import { Scope, signal } from "../../lifetime"
import type { Cancel, NetPort, TimerPort } from "../../platform"
import { NetError } from "./NetError"
import { PTPClientSocket } from "./PTPClientSocket"
import { PTPHostSocket } from "./PTPHostSocket"
import type { Peer } from "./Room"
import type { SignalingConnector } from "./Signaling"
import type { Removable } from "../../lifetime"

/** Where a member stands in the sharing of the value. */
export type SharedRole = "electing"|"host"|"client"

/** What a shared socket is opened with. */
export interface SharedOptions<T, M> {
    /**
     * The rooms where the members meet, in order of priority: each is a code of the signaling. The first
     * to hold the room of a code is the host of it. Members settle on the first code that works, and the ones
     * that settled on a later one come back to a better one when it answers again.
     *
     * Give at least three, so a room lost without a word, which stays taken a while on a relay of PeerJS,
     * does not leave the members with nowhere to meet. A room is full at its `capacity`: the next code takes
     * the others in.
     */
    readonly codes: readonly string[]

    /** Make the value when no one has it yet: the first host, or the first after every holder was lost. */
    readonly factory: () => T

    /**
     * Take a change into the value, and give the value it makes. It is called on the host only, with the
     * value it holds and the change of any member, its own included, so it is also where a change is checked.
     * One that throws is not applied, and is dropped.
     */
    readonly accumulate: (current: T, change: M) => T

    /** Where time goes. */
    readonly timer: TimerPort

    /** The name of the rooms, which the members read. `"shared"` by default. */
    readonly name?: string

    /** The most members in a room, the host included. 32 by default. */
    readonly capacity?: number

    /** How long a connection or a host's first word may take before it is given up, in ms. 8000 default. */
    readonly openTimeout?: number

    /**
     * How often a member that settled on a code that is not the first looks if a better one answers, in
     * milliseconds, give or take half. 45000 by default, 0 to never look.
     */
    readonly probeInterval?: number

    /**
     * How long to wait before the codes are tried again when none worked, in milliseconds, give or take half.
     * 1000 by default.
     */
    readonly retryDelay?: number

    /** Draws in [0, 1[ for the waits, so they do not all end together: `Math.random` by default. */
    readonly random?: () => number
}

/** What a client says to the host. */
type ToHost =
    | { readonly t: "hello" }
    | { readonly t: "change", readonly id: string, readonly change: unknown }

/** What the host says to a client. */
interface ToClient {
    readonly t: "state"
    readonly value: unknown

    /** The ids of the last changes taken into the value, so that a member knows which of its own are. */
    readonly applied: readonly string[]
}

const DEFAULTS = { name: "shared", capacity: 32, openTimeout: 8_000, probeInterval: 45_000, retryDelay: 1_000 }

/** How many ids of changes the host remembers having taken in. */
const APPLIED_KEPT = 128

/** How many characters the id of a change has. */
const ID_LENGTH = 12

/**
 * A value every member reads, kept by one of them. The members meet at the rooms of fixed codes, where the
 * first to open one hosts it, holds the value, and takes in the changes of all; the others join it, and
 * hear the value each time it changes. A member that wants to change the value sends a change, and the host
 * makes the new value by the {@link SharedOptions.accumulate | accumulator}.
 *
 * @remarks
 * It lives as long as there are members: when the host is lost, the members meet again at the codes, and the
 * first to open the room is the host, with the last value it heard. What the lost host had taken in since
 * is lost, but a change a member sent and did not hear taken in is sent again to the new host, so it is
 * taken in once. Do not use it to keep what must not be lost.
 *
 * The host sends the whole value at each change: keep it small.
 *
 * It only needs rooms where each member links to the host alone, so it works on every signaling that holds
 * stars.
 */
export class PTPSharedSocket<T, M> {


    /**
     * Take part in the sharing: look for the host at the codes, and host the value if there is none.
     *
     * @param connect - Reaches the signaling.
     * @throws {@link NetError} When no code of the list led to a room, host or client: the signaling cannot
     * be reached, or every room is full or lost.
     */
    public static async open<T, M>(
        net: NetPort,
        connect: SignalingConnector,
        options: SharedOptions<T, M>,
    ): Promise<PTPSharedSocket<T, M>> {
        const socket = new PTPSharedSocket<T, M>(net, connect, options)
        try {
            await socket.#ready
        } catch(error){
            socket.close()
            throw error
        }
        return socket
    }


    private constructor(
        private readonly net: NetPort,
        private readonly connect: SignalingConnector,
        private readonly options: SharedOptions<T, M>,
    ){
        if(options.codes.length === 0) throw new Error("A shared socket needs at least one code to meet at.")
        this.#ready = new Promise((resolve, reject) => {
            this.#settleReady = { resolve, reject }
        })
        // A shared socket nobody awaits any more (closed meanwhile) keeps its failure to itself.
        this.#ready.catch(() => {})
        void this.#elect(this.#generation)
    }


    /** The value now: the last one the host told, or the host's own. */
    public get value(): T {
        if(!this.#hasValue) throw new Error("The shared value is not known yet.")
        return this.#value as T
    }

    public get role(): SharedRole { return this.#role }

    /** Does this member hold the value, and take in the changes? */
    public get isHost(): boolean { return this.#role === "host" }

    /** Does this member hold the value or hear it from its host? False while it looks for a room. */
    public get isConnected(): boolean { return this.#role !== "electing" }

    /** How many changes this member sent that the host did not tell it has taken in. */
    public get pending(): number { return this.#pending.size }

    /** The code of the room this member is in, none while it looks for one. */
    public get code(): string|null {
        return this.#index < 0 ? null : this.options.codes[this.#index]
    }

    /** Be told of each value, once the host changed it, until the returned handle is disposed. */
    public onChange(handler: (value: T) => void): Removable {
        return this.#changes.add(handler)
    }

    /** Be told when this member becomes the host, or a client, or is looking for a room again. */
    public onRole(handler: (role: SharedRole) => void): Removable {
        return this.#roles.add(handler)
    }

    /**
     * Change the value. The host takes the change in at once; any other member sends it to the host, and
     * hears the new value with the others. A change sent while there is no host is kept for the next one.
     *
     * @throws {@link Error} When this member is the host and the accumulator throws.
     */
    public send(change: M): void {
        const id = randomId(this.options.random ?? Math.random)
        if(this.#role === "host"){
            this.#take(id, change)
            this.#tell()
            this.#changes.notify(this.#value as T)
            return
        }
        this.#pending.set(id, change)
        const client = this.#client
        if(this.#role === "client" && client) this.#sendChange(client, id, change)
    }

    /** Leave: nothing is held or heard from now on. Doing it twice changes nothing. */
    public close(): void {
        if(this.#isClosed) return
        this.#isClosed = true
        this.#generation++
        this.#cancelWaits()
        this.#detach()
        this.#settleReady.reject(new NetError("closed", "The shared socket was closed before it joined a room."))
        this.#changes.clear()
        this.#roles.clear()
    }


    readonly #ready: Promise<void>
    #settleReady!: { resolve(): void, reject(error: Error): void }
    readonly #changes = signal<T>()
    readonly #roles = signal<SharedRole>()

    #role: SharedRole = "electing"
    #value: T|undefined
    #hasValue = false

    /** What a change gets from the host to be known as taken in, kept in the order it was sent. */
    readonly #pending = new Map<string, M>()

    /** The room this member hosts, or the link to the host of the room it joined. */
    #host: PTPHostSocket|null = null

    /** What listens to the room hosted or the link held, taken back with it. */
    #links = new Scope()
    #client: PTPClientSocket|null = null
    #index = -1

    /** The ids of the last changes the host took in, oldest first. */
    #applied: string[] = []

    /** The members the host told the value to, and tells it again at each change. */
    readonly #welcomed = new Set<string>()

    /** Grows each time what this member does is replaced, so that what started before knows it is stale. */
    #generation = 0
    #isClosed = false
    #everReady = false
    #probe: Cancel|null = null
    readonly #sleeping = new Set<Cancel>()

    #isStale(generation: number): boolean {
        return this.#isClosed || generation !== this.#generation
    }

    #setRole(role: SharedRole): void {
        if(this.#role === role) return
        this.#role = role
        this.#roles.notify(role)
    }

    #jitter(base: number): number {
        return base * (0.5 + (this.options.random ?? Math.random)())
    }

    /** Wait, unless this member closes meanwhile, which ends the wait. */
    #sleep(ms: number): Promise<void> {
        return new Promise(resolve => {
            const wait = this.options.timer.after(ms, () => {
                this.#sleeping.delete(wait)
                resolve()
            })
            this.#sleeping.add(wait)
        })
    }

    #cancelWaits(): void {
        this.#probe?.cancel()
        this.#probe = null
        for(const wait of this.#sleeping) wait.cancel()
        this.#sleeping.clear()
    }

    /** Let go of the room or the link this member holds, without it being taken as lost. */
    #detach(): void {
        // What listened to the room or the link goes first, so closing them is not heard as a loss.
        this.#links.remove()
        this.#links = new Scope()
        const host = this.#host
        const client = this.#client
        this.#host = null
        this.#client = null
        this.#index = -1
        this.#welcomed.clear()
        host?.close()
        client?.close()
    }

    /** The room or link was lost: meet again at the codes, unless this member closed. */
    #lost(): void {
        if(this.#isClosed) return
        this.#generation++
        this.#probe?.cancel()
        this.#probe = null
        this.#detach()
        this.#setRole("electing")
        void this.#elect(this.#generation)
    }


    //// Meeting ////

    /** Look for the host at each code, and host the value at the first free one, until one works. */
    async #elect(generation: number): Promise<void> {
        let lastError: unknown = new NetError("unreachable", "No code of the shared socket led to a room.")
        // A member that lost its host does not rush to the same room as the others.
        if(this.#everReady) await this.#sleep(this.#jitter(this.#delay("retryDelay") / 4))
        for(;;){
            for(let index = 0; index < this.options.codes.length; index++){
                if(this.#isStale(generation)) return
                try {
                    if(await this.#tryCode(index, generation)) return
                } catch(error){
                    lastError = error
                }
            }
            if(this.#isStale(generation)) return
            if(!this.#everReady){
                this.#settleReady.reject(lastError instanceof Error ? lastError : new NetError("unreachable", String(lastError)))
                return
            }
            await this.#sleep(this.#jitter(this.#delay("retryDelay")))
        }
    }

    #delay(name: "retryDelay"|"probeInterval"|"openTimeout"): number {
        return this.options[name] ?? DEFAULTS[name]
    }

    /**
     * Take the room of a code: host it if no one does, join its host if one does.
     *
     * @returns Whether this member has a place in it.
     */
    async #tryCode(index: number, generation: number): Promise<boolean> {
        const { codes, timer, name, capacity } = this.options
        const code = codes[index]
        const openTimeout = this.#delay("openTimeout")
        // The host may leave between the refusal of the room and the entry into it, which asks again.
        for(let attempt = 0; attempt < 3; attempt++){
            try {
                const host = await PTPHostSocket.open(this.net, this.connect, {
                    name: name ?? DEFAULTS.name, code, timer, openTimeout,
                    capacity: capacity ?? DEFAULTS.capacity,
                })
                if(this.#isStale(generation)){
                    host.close()
                    return true
                }
                this.#becomeHost(host, index)
                return true
            } catch(error){
                if(!(error instanceof NetError) || error.reason !== "taken") throw error
            }
            let client: PTPClientSocket
            try {
                client = await PTPClientSocket.join(this.net, this.connect, code, {
                    data: null, timer, openTimeout,
                })
            } catch(error){
                if(error instanceof NetError && error.reason === "not-found"){
                    await this.#sleep(this.#jitter(100))
                    if(this.#isStale(generation)) return true
                    continue
                }
                throw error
            }
            if(this.#isStale(generation)){
                client.close()
                return true
            }
            const greeting = await this.#greet(client)
            if(this.#isStale(generation)){
                client.close()
                return true
            }
            if(typeof greeting === "string"){
                client.close()
                // A host lost as this member came is asked again; one that says nothing is not asked twice.
                if(greeting === "lost") continue
                return false
            }
            this.#join(client, index, greeting)
            return true
        }
        return false
    }

    #becomeHost(host: PTPHostSocket, index: number): void {
        this.#host = host
        this.#index = index
        if(!this.#hasValue){
            this.#value = this.options.factory()
            this.#hasValue = true
        }
        // What this member sent and the last host did not tell it took in is taken in now, once.
        for(const [id, change] of [...this.#pending]){
            this.#pending.delete(id)
            this.#tryTake(id, change)
        }
        this.#links.track(
            host.onClient(peer => this.#watch(host, peer)),
            host.onLeave(member => this.#welcomed.delete(member.id)),
            host.onClose(() => {
                if(this.#host === host) this.#lost()
            }),
        )
        this.#setRole("host")
        this.#markReady()
        this.#changes.notify(this.#value as T)
        this.#scheduleProbe()
    }

    /**
     * Say hello to the host of a room, and wait for its first word: the value.
     *
     * @returns The state the host told, `"silent"` when it says nothing in time, `"lost"` when the link is
     * lost first.
     */
    #greet(client: PTPClientSocket): Promise<ToClient|"silent"|"lost"> {
        return new Promise(resolve => {
            let isDone = false
            const finish = (outcome: ToClient|"silent"|"lost"): void => {
                if(isDone) return
                isDone = true
                timeout.cancel()
                listening.remove()
                closing.remove()
                resolve(outcome)
            }
            const listening = client.listen(text => {
                const message = readMessage<ToClient>(text)
                if(message?.t === "state" && Array.isArray(message.applied)) finish(message)
            })
            const closing = client.onClose(() => finish("lost"))
            const timeout = this.options.timer.after(this.#delay("openTimeout"), () => finish("silent"))
            try {
                client.send(writeMessage({ t: "hello" }))
            } catch{
                finish("lost")
            }
        })
    }

    /** Settle in the room of a host that told its value: this member is a client of it from now on. */
    #join(client: PTPClientSocket, index: number, state: ToClient): void {
        this.#client = client
        this.#index = index
        this.#links.track(
            client.listen(text => this.#hearHost(client, text)),
            client.onClose(() => {
                if(this.#client === client) this.#lost()
            }),
        )
        this.#hear(state)
        this.#setRole("client")
        this.#markReady()
        // What this member sent and this host never took in is sent to it now.
        for(const [id, change] of this.#pending) this.#sendChange(client, id, change)
        this.#scheduleProbe()
    }

    /** Come back to a code of a higher priority from time to time, if this member settled on a later one. */
    #scheduleProbe(): void {
        const interval = this.#delay("probeInterval")
        if(interval <= 0 || this.#index <= 0 || this.#isClosed) return
        const generation = this.#generation
        this.#probe = this.options.timer.after(this.#jitter(interval), () => {
            this.#probe = null
            void this.#look(generation)
        })
    }

    /** Join the first code that answers among those of a higher priority than the one this member is at. */
    async #look(generation: number): Promise<void> {
        const { codes, timer } = this.options
        const openTimeout = this.#delay("openTimeout")
        for(let index = 0; index < this.#index; index++){
            if(this.#isStale(generation)) return
            let client: PTPClientSocket
            try {
                client = await PTPClientSocket.join(this.net, this.connect, codes[index], {
                    data: null, timer, openTimeout,
                })
            } catch{
                // Nobody there, lost, or full: nothing changes.
                continue
            }
            if(this.#isStale(generation)){
                client.close()
                return
            }
            // The host must answer before this member leaves the room it is in.
            const greeting = await this.#greet(client)
            if(this.#isStale(generation) || typeof greeting === "string"){
                client.close()
                if(this.#isStale(generation)) return
                continue
            }
            // A better room answers: leave this one, and take the value of that one.
            this.#generation++
            this.#probe?.cancel()
            this.#detach()
            this.#join(client, index, greeting)
            return
        }
        if(!this.#isStale(generation)) this.#scheduleProbe()
    }

    #markReady(): void {
        this.#everReady = true
        this.#settleReady.resolve()
    }


    //// The host ////

    /** Hear a client of the room this member hosts. */
    #watch(host: PTPHostSocket, peer: Peer): void {
        this.#links.track(peer.connection.listen(text => {
            if(this.#host !== host) return
            const message = readMessage<ToHost>(text)
            if(message?.t === "hello"){
                this.#welcomed.add(peer.member.id)
                this.#tellTo(peer)
            }
            else if(message?.t === "change" && typeof message.id === "string"){
                if(!this.#applied.includes(message.id)){
                    this.#tryTake(message.id, message.change as M)
                    this.#tell()
                    this.#changes.notify(this.#value as T)
                }
                // A change heard again is one the client did not hear taken in: it is told so.
                else this.#tellTo(peer)
            }
        }))
    }

    /** Take a change in, or drop it when the accumulator refuses it: its sender hears it is over. */
    #tryTake(id: string, change: M): void {
        try {
            this.#take(id, change)
        } catch{
            this.#remember(id)
        }
    }

    #take(id: string, change: M): void {
        this.#value = this.options.accumulate(this.#value as T, change)
        this.#remember(id)
    }

    #remember(id: string): void {
        this.#applied.push(id)
        if(this.#applied.length > APPLIED_KEPT) this.#applied = this.#applied.slice(-APPLIED_KEPT)
    }

    /** Tell the value to every client that asked for it. */
    #tell(): void {
        const host = this.#host
        if(!host) return
        for(const id of this.#welcomed){
            const peer = host.room.peer(id)
            if(peer) this.#tellTo(peer)
        }
    }

    /** Tell the value to a client. A link that broke as it was written to is lost, which the room tells. */
    #tellTo(peer: Peer): void {
        if(peer.connection.state !== "open") return
        try {
            peer.connection.send(this.#state())
        } catch{
            // The room tells of the loss of the client.
        }
    }

    #state(): string {
        const state: ToClient = { t: "state", value: this.#value, applied: this.#applied }
        return writeMessage(state)
    }


    //// A client ////

    /** Hear the host of the room this member joined. */
    #hearHost(client: PTPClientSocket, text: string): void {
        if(this.#client !== client) return
        const message = readMessage<ToClient>(text)
        if(message?.t !== "state" || !Array.isArray(message.applied)) return
        this.#hear(message)
        this.#changes.notify(this.#value as T)
    }

    /** Take the state the host told: its value, and which changes it took in. */
    #hear(state: ToClient): void {
        this.#value = state.value as T
        this.#hasValue = true
        // Kept, so that this member, should it become the host, goes on from what the last one had taken in.
        this.#applied = state.applied.map(String)
        for(const id of this.#applied) this.#pending.delete(id)
    }

    /** Send a change to the host, if the link still holds: it is kept in the pending ones either way. */
    #sendChange(client: PTPClientSocket, id: string, change: M): void {
        // A link lost and not known yet to be is no place to send: the change waits for the next host.
        if(client.state !== "open") return
        try {
            client.send(writeMessage({ t: "change", id, change }))
        } catch{
            // The link broke as it was written to: the loss is told by the link, and the change waits.
        }
    }
}

function writeMessage(message: ToHost|ToClient): string {
    return JSON.stringify(message)
}

/** What a member said, none when it is no message of this socket: a member that misbehaves is ignored. */
function readMessage<M extends ToHost|ToClient>(text: string): M|null {
    try {
        const message: unknown = JSON.parse(text)
        if(typeof message !== "object" || message === null || typeof (message as { t?: unknown }).t !== "string") return null
        return message as M
    } catch{
        return null
    }
}

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"

function randomId(random: () => number): string {
    return Array.from({ length: ID_LENGTH }, () => ID_ALPHABET[Math.floor(random() * ID_ALPHABET.length)]).join("")
}
