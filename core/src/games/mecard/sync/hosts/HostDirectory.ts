import type { Cancel, NetPort, TimerPort } from "../../../../platform"
import { faultOf, PTPSharedSocket } from "../../../../engine/net"
import type { Fault, SignalingConnector } from "../../../../engine/net"
import { signal } from "../faults"
import type { Removable } from "../../../../lifetime"

/** A player that hosts a room others may join. */
export interface HostEntry {
    /** The code of the room. */
    readonly code: string

    /** The name of the host. */
    readonly name: string

    /** When the host of the directory last heard of this one, in the time of that host. */
    readonly seen: number
}

/** What a member of the directory says about a room it hosts. */
export interface HostChange {
    readonly code: string
    readonly name: string

    /** Does the room still stand? False when the host leaves it or closes it to newcomers. */
    readonly live: boolean
}

/** How often a host says its room still stands, in milliseconds. */
export const HOST_BEAT = 5_000

/** How long a room stays listed without being heard of, in milliseconds: three beats. */
export const HOST_TTL = 15_000

/** The rooms where the directory members meet, in order of priority. */
export const DIRECTORY_CODES: readonly string[] = ["MECARD-HOSTS-1", "MECARD-HOSTS-2", "MECARD-HOSTS-3"]

/** The name of the rooms of the directory. */
const DIRECTORY_NAME = "mecard-hosts"

/** What shows the rooms players host, and lists the one of this player. */
export interface HostBoard {
    /** Told with the rooms standing, each time they change. */
    readonly changed: { add(listener: (hosts: readonly HostEntry[]) => void): { remove(): void } }

    /** The rooms standing, the oldest first. */
    readonly hosts: readonly HostEntry[]

    /** Say a room stands, until {@link HostBoard.retire}. */
    announce(code: string, name: string): void

    /** Say the room announced stands no more. */
    retire(): void

    /** Leave the board. */
    dispose(): void
}

/**
 * The list of the rooms players host, shared between everyone that looks at it, whether or not they are in
 * a room: each host says every {@link HOST_BEAT} that its room stands, and a room not heard of for
 * {@link HOST_TTL} falls out of the list.
 */
export class HostDirectory implements HostBoard {


    /**
     * Join the directory, or be the first of it.
     *
     * @returns The directory, or why it cannot be reached. It never rejects.
     */
    public static async open(
        net: NetPort,
        connect: SignalingConnector,
        timer: TimerPort,
        options: { readonly codes?: readonly string[], readonly beat?: number, readonly ttl?: number } = {},
    ): Promise<HostDirectory|Fault> {
        const ttl = options.ttl ?? HOST_TTL
        try {
            const socket = await PTPSharedSocket.open<readonly HostEntry[], HostChange>(net, connect, {
                codes: options.codes ?? DIRECTORY_CODES,
                name: DIRECTORY_NAME,
                timer,
                factory: () => [],
                accumulate: (list, change) => accumulate(list, change, timer.now(), ttl),
            })
            return new HostDirectory(socket, timer, options.beat ?? HOST_BEAT, ttl)
        } catch(error){
            return faultOf(error)
        }
    }


    /** Told with the rooms standing, each time they change. */
    public readonly changed = signal<readonly HostEntry[]>()

    /** The rooms standing, the oldest first. */
    public get hosts(): readonly HostEntry[] {
        return this.socket.isConnected ? fresh(this.socket.value, this.timer.now(), this.ttl) : []
    }

    /** Say a room stands, now and every beat, until {@link HostDirectory.retire}. Replaces the last one. */
    public announce(code: string, name: string): void {
        this.retire()
        this.#room = { code, name }
        this.#beat()
    }

    /** Say the room announced stands no more. */
    public retire(): void {
        this.#next?.cancel()
        this.#next = null
        const room = this.#room
        this.#room = null
        if(room && !this.#isDisposed) this.#send({ ...room, live: false })
    }

    /** Leave the directory. */
    public dispose(): void {
        this.retire()
        this.#isDisposed = true
        this.#stopSweep()
        this.#roleWatch.remove()
        this.#watch.remove()
        this.changed.clear()
        this.socket.close()
    }


    readonly #watch: Removable
    readonly #roleWatch: Removable
    #room: { readonly code: string, readonly name: string }|null = null
    #next: Cancel|null = null
    #sweep: Cancel|null = null
    #isDisposed = false

    private constructor(
        private readonly socket: PTPSharedSocket<readonly HostEntry[], HostChange>,
        private readonly timer: TimerPort,
        private readonly interval: number,
        private readonly ttl: number,
    ){
        this.#watch = socket.onChange(() => this.changed.notify(this.hosts))
        // Only the member that holds the list lets go of the rooms that stopped beating: the others are told.
        this.#roleWatch = socket.onRole(() => this.#syncSweep())
        this.#syncSweep()
    }

    /** Sweep while this member holds the list, and only then. */
    #syncSweep(): void {
        if(this.#isDisposed) return
        if(!this.socket.isHost) this.#stopSweep()
        else if(!this.#sweep) this.#sweep = this.timer.after(this.interval, () => this.#runSweep())
    }

    #stopSweep(): void {
        this.#sweep?.cancel()
        this.#sweep = null
    }

    /** Let go of the rooms not heard of for too long, telling everyone, then sweep again. */
    #runSweep(): void {
        this.#sweep = null
        if(this.#isDisposed || !this.socket.isHost) return
        const now = this.timer.now()
        const standing = new Set(fresh(this.socket.value, now, this.ttl).map(entry => entry.code))
        for(const entry of this.socket.value){
            if(!standing.has(entry.code)) this.#send({ code: entry.code, name: entry.name, live: false })
        }
        this.#sweep = this.timer.after(this.interval, () => this.#runSweep())
    }

    #beat(): void {
        const room = this.#room
        if(!room || this.#isDisposed) return
        this.#send({ ...room, live: true })
        this.#next = this.timer.after(this.interval, () => this.#beat())
    }

    #send(change: HostChange): void {
        try {
            this.socket.send(change)
        } catch{
            // A refused change is dropped; the next beat says it again.
        }
    }
}

/** Take what a member said into the list, and let go of the rooms not heard of for too long. */
function accumulate(
    list: readonly HostEntry[], change: HostChange, now: number, ttl: number,
): readonly HostEntry[] {
    if(typeof change.code !== "string" || typeof change.name !== "string") throw new Error("Not a host change.")
    const kept = fresh(list, now, ttl)
    if(!change.live) return kept.filter(entry => entry.code !== change.code)
    const entry: HostEntry = { code: change.code, name: change.name, seen: now }
    // A room keeps its place in the list while it beats.
    if(!kept.some(existing => existing.code === change.code)) return [...kept, entry]
    return kept.map(existing => existing.code === change.code ? entry : existing)
}

/** The rooms heard of lately. */
function fresh(list: readonly HostEntry[], now: number, ttl: number): readonly HostEntry[] {
    return list.filter(entry => now - entry.seen <= ttl)
}
