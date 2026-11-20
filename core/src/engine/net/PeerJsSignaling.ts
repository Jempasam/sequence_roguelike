import { MAX_DATA_LENGTH } from "@game/server/protocol"
import type { IceServer, JsonValue, Member, PeerSignal } from "@game/server/protocol"

import type { Cancel, NetPort, TimerPort } from "../../platform"
import { Listeners } from "./Listeners"
import { NetError } from "./NetError"
import { PeerJsConnection } from "./PeerJsConnection"
import type { PeerJsRelayed } from "./PeerJsConnection"
import type { RoomCreation, RoomEntry, RoomEvent, Signaling } from "./Signaling"

/**
 * How long a knock waits for the word of the host, in milliseconds. The server of PeerJS holds a message for
 * an id nobody has for 5 seconds before it tells so, with an `EXPIRE`.
 */
const KNOCK_TIMEOUT = 8_000

/** How many codes are tried against the ones others hold, when the code is made up. */
const CODE_ATTEMPTS = 5

/** How long a code made up is. */
const CODE_LENGTH = 6

/** The letters of the codes and ids made up: no 0 nor O, no 1 nor I, as in the codes of the game server. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** What a client that gave no `prefix` and no `stun` in its address uses. */
const DEFAULT_PREFIX = "game"
const DEFAULT_STUN = "stun.l.google.com:19302"

/** What this signaling says to the members of a room, in the payload of the messages the server relays. */
type Say =
    | { readonly k: "knock", readonly data: JsonValue }
    | { readonly k: "admit", readonly result: "yes"|"no"|"full", readonly name?: string, readonly host?: Member }
    | { readonly k: "signal", readonly signal: PeerSignal }
    | { readonly k: "data", readonly data: JsonValue }

/**
 * The signaling over the relay of a PeerJS server, public or not: it only passes messages between clients
 * that connected under an id of their choice, and keeps no room nor member list. This makes the rooms of the
 * game out of it, a star each, by what the clients say to each other inside the payloads.
 *
 * @remarks
 * The address is `peerjs://host[:port][/path][?key=…&prefix=…&stun=…]`, or `peerjss://` for TLS. The `key` is
 * that of the server (`peerjs` by default), the `prefix` names the game among the others that use the same
 * server, and each `stun` is a STUN server to gather candidates from.
 *
 * The room of a code is the id `$PREFIX-$CODE`: its owner connects under it, so that the server of PeerJS
 * refuses anyone else that asks for it, and a newcomer knocks on it. Every other member connects under an id
 * of its own, made up. That is also why only stars are held: there is nobody to ask who else is in a room,
 * nor to take the room over when its owner leaves.
 *
 * The owner leaving, or being lost, is told to the members by a `LEAVE` when it is clean, and by the loss of
 * their connection to it when it is not. A host lost without a word keeps its id for the 90 seconds the
 * server waits for its heartbeat, during which a knock on it is never answered.
 */
export class PeerJsSignaling implements Signaling {


    constructor(
        private readonly net: NetPort,
        private readonly timer: TimerPort,
        url: string,
    ){
        const secure = /^peerjss/i.test(url)
        const parsed = new URL(url.replace(/^peerjss/i, "https").replace(/^peerjs/i, "http"))
        const path = parsed.pathname.endsWith("/") ? parsed.pathname : `${parsed.pathname}/`
        this.#endpoint = `${secure ? "wss" : "ws"}://${parsed.host}${path}peerjs`
        this.#key = parsed.searchParams.get("key") ?? "peerjs"
        this.#prefix = (parsed.searchParams.get("prefix") ?? DEFAULT_PREFIX).toUpperCase()
        // An empty `stun=` asks for none: a network where the peers reach each other needs no STUN.
        const stuns = parsed.searchParams.getAll("stun")
        const servers = stuns.length > 0 ? stuns.filter(stun => stun !== "") : [DEFAULT_STUN]
        this.#iceServers = servers.map(stun => ({ urls: [`stun:${stun}`] }))
    }


    public get iceServers(): readonly IceServer[] { return this.#iceServers }

    public async create(room: RoomCreation): Promise<RoomEntry> {
        if(room.shape !== "star"){
            throw new Error("PeerJS signaling has no member list nor succession of the owner: a mesh room needs the game server.")
        }
        this.#ensureFree()
        const asked = room.code?.toUpperCase()
        for(let attempt = 1; ; attempt++){
            const code = asked ?? randomText(CODE_LENGTH)
            try {
                await this.#register(this.#idOf(code))
            } catch(error){
                const isCollision = error instanceof NetError && error.reason === "taken"
                if(asked === undefined && isCollision && attempt < CODE_ATTEMPTS) continue
                throw error
            }
            this.#role = "owner"
            this.#code = code
            this.#name = room.name
            this.#capacity = room.capacity
            this.#self = { id: this.#id, data: room.data }
            return {
                code, name: room.name, shape: "star", self: this.#self, owner: this.#id, members: [],
            }
        }
    }

    public async join(code: string, data: JsonValue): Promise<RoomEntry> {
        this.#ensureFree()
        const id = `${this.#prefix}-C-${randomText(10)}`
        try {
            await this.#register(id)
        } catch(error){
            // An id made up by chance that was taken is no fault of the room asked for.
            if(error instanceof NetError && error.reason === "taken") throw new NetError("unreachable", "The relay refused the id of this client.")
            throw error
        }
        const upper = code.toUpperCase()
        this.#role = "guest"
        this.#code = upper
        this.#hostId = this.#idOf(upper)
        this.#self = { id: this.#id, data }
        return new Promise<RoomEntry>((resolve, reject) => {
            this.#entry = { resolve, reject }
            this.#knockWait = this.timer.after(KNOCK_TIMEOUT, () => {
                this.#failEntry(new NetError("unreachable", `Nothing answered at the room ${upper}: it is not there, or its owner is lost.`))
            })
            this.#send(this.#hostId, "OFFER", { k: "knock", data })
        })
    }

    public admit(member: string, accepted: boolean): void {
        if(this.#role !== "owner") return
        const knocking = this.#knocking.get(member)
        if(!knocking) return
        this.#knocking.delete(member)
        if(!accepted){
            this.#send(member, "ANSWER", { k: "admit", result: "no" })
            return
        }
        this.#members.set(member, knocking)
        this.#send(member, "ANSWER", { k: "admit", result: "yes", name: this.#name, host: this.#self })
        this.#events.emit({ type: "joined", member: knocking })
    }

    public setData(data: JsonValue): void {
        this.#self = { id: this.#self.id, data }
        for(const id of this.#linked()) this.#send(id, "CANDIDATE", { k: "data", data })
    }

    public signal(to: string, signal: PeerSignal): void {
        const type = signal.kind === "candidate" ? "CANDIDATE" : signal.type === "offer" ? "OFFER" : "ANSWER"
        this.#send(to, type, { k: "signal", signal })
    }

    public onEvent(handler: (event: RoomEvent) => void): { dispose(): void } {
        return this.#events.add(handler)
    }

    public onClose(handler: (reason: NetError) => void): { dispose(): void } {
        const reason = this.#ended
        if(!reason) return this.#closed.add(handler)
        let isDisposed = false
        queueMicrotask(() => {
            if(!isDisposed) handler(reason)
        })
        return { dispose: () => { isDisposed = true } }
    }

    public close(): void {
        const connection = this.#connection
        if(!connection) return
        if(connection.state === "open") for(const id of [...this.#linked(), ...this.#knocking.keys()]) connection.send("LEAVE", id, { k: "leave" })
        connection.close()
    }


    readonly #endpoint: string
    readonly #key: string
    readonly #prefix: string
    readonly #iceServers: readonly IceServer[]
    readonly #events = new Listeners<RoomEvent>()
    readonly #closed = new Listeners<NetError>()

    /** The members of the room this client owns, or the owner of the room it entered. */
    readonly #members = new Map<string, Member>()

    /** The ones that knocked on the room this client owns, and wait to be let in. */
    readonly #knocking = new Map<string, Member>()

    #connection: PeerJsConnection|null = null
    #isOpening = false
    #id = ""
    #role: "owner"|"guest"|null = null
    #code = ""
    #name = ""
    #capacity = 0
    #hostId = ""
    #self: Member = { id: "", data: null }
    #ended: NetError|null = null

    /** Settles the entry of a guest, while the host has not answered its knock. */
    #entry: { resolve(entry: RoomEntry): void, reject(error: NetError): void }|null = null
    #knockWait: Cancel|null = null

    #ensureFree(): void {
        if(this.#connection || this.#isOpening) throw new Error("A signaling is for one room, entered once.")
    }

    /** The id of the room of a code, which the owner connects under. */
    #idOf(code: string): string {
        return `${this.#prefix}-${code}`
    }

    /** The members this client is linked to: all of them for the owner, the owner for a guest. */
    #linked(): string[] {
        return this.#role === "owner" ? [...this.#members.keys()] : this.#role === "guest" ? [this.#hostId] : []
    }

    /**
     * Connect to the server of PeerJS under an id: the connection is the registration, and a client that
     * connects under an id another holds is refused with `ID-TAKEN`.
     *
     * @throws {@link NetError} `"taken"` when another holds the id, `"unreachable"` when the server fails.
     */
    async #register(id: string): Promise<void> {
        this.#isOpening = true
        try {
            const connection = await PeerJsConnection.open({
                net: this.net, timer: this.timer, endpoint: this.#endpoint, key: this.#key, id,
            })
            this.#connection = connection
            this.#id = id
            connection.onMessage(message => this.#hear(message))
            connection.onClose(reason => this.#end(reason))
        } finally {
            this.#isOpening = false
        }
    }

    /** Say something to an id, in the payload of a message the server of PeerJS relays. */
    #send(to: string, type: "OFFER"|"ANSWER"|"CANDIDATE", say: Say): void {
        this.#connection?.send(type, to, say)
    }

    #hear(message: PeerJsRelayed): void {
        const from = message.from
        if(message.type === "EXPIRE"){
            // Nothing read what was sent to the owner in time: it is not there.
            if(this.#role === "guest" && from === this.#hostId) {
                this.#failEntry(new NetError("unreachable", `Nothing answered at the room ${this.#code}: it is not there, or its owner is lost.`))
            }
            return
        }
        const say = sayOf(message.payload)
        if(message.type === "LEAVE" || (say === null && isLeave(message.payload))){
            this.#heardLeave(from)
            return
        }
        if(say === null) return
        if(this.#role === "owner") this.#heardAsOwner(from, say)
        else if(this.#role === "guest" && from === this.#hostId) this.#heardAsGuest(say)
    }

    #heardAsOwner(from: string, say: Say): void {
        switch(say.k){
            case "knock": {
                if(this.#members.has(from) || this.#knocking.has(from)) return
                const isTooLong = JSON.stringify(say.data ?? null).length > MAX_DATA_LENGTH
                if(isTooLong){
                    this.#send(from, "ANSWER", { k: "admit", result: "no" })
                    return
                }
                if(1 + this.#members.size + this.#knocking.size >= this.#capacity){
                    this.#send(from, "ANSWER", { k: "admit", result: "full" })
                    return
                }
                const member = { id: from, data: say.data ?? null }
                this.#knocking.set(from, member)
                this.#events.emit({ type: "knocking", member })
                return
            }
            case "signal":
                if(this.#members.has(from)) this.#events.emit({ type: "signal", from, signal: say.signal })
                return
            case "data": {
                const member = this.#members.get(from)
                if(!member) return
                const changed = { id: from, data: say.data ?? null }
                this.#members.set(from, changed)
                this.#events.emit({ type: "changed", member: changed })
                return
            }
            default:
                return
        }
    }

    #heardAsGuest(say: Say): void {
        switch(say.k){
            case "admit": {
                const entry = this.#entry
                if(!entry) return
                if(say.result === "yes" && say.host){
                    this.#members.set(this.#hostId, say.host)
                    this.#settleEntry()
                    entry.resolve({
                        code: this.#code, name: say.name ?? this.#code, shape: "star", self: this.#self,
                        owner: this.#hostId, members: [say.host],
                    })
                    return
                }
                const refusal = say.result === "full"
                    ? new NetError("full", "The room is full.")
                    : new NetError("refused", "The owner of the room refused to let this member in.")
                this.#failEntry(refusal)
                return
            }
            case "signal":
                if(this.#entry === null) this.#events.emit({ type: "signal", from: this.#hostId, signal: say.signal })
                return
            case "data": {
                const changed = { id: this.#hostId, data: say.data ?? null }
                this.#members.set(this.#hostId, changed)
                if(this.#entry === null) this.#events.emit({ type: "changed", member: changed })
                return
            }
            default:
                return
        }
    }

    /** A member left cleanly, or the server could not reach it any more. */
    #heardLeave(from: string): void {
        if(this.#role === "guest"){
            if(from !== this.#hostId) return
            this.#failEntry(new NetError("closed", "The room closed: its host left."))
            this.#connection?.closeFor(new NetError("closed", "The room closed: its host left."))
            return
        }
        if(this.#knocking.delete(from)){
            this.#events.emit({ type: "left", member: from })
            return
        }
        if(this.#members.delete(from)) this.#events.emit({ type: "left", member: from })
    }

    #settleEntry(): void {
        this.#knockWait?.cancel()
        this.#knockWait = null
        this.#entry = null
    }

    #failEntry(error: NetError): void {
        const entry = this.#entry
        this.#settleEntry()
        entry?.reject(error)
    }

    /** The connection to the server of PeerJS ended: everything of the room ends with it. */
    #end(reason: NetError): void {
        if(this.#ended) return
        this.#ended = reason
        this.#failEntry(reason)
        this.#events.clear()
        this.#closed.emit(reason)
        this.#closed.clear()
    }
}

function isLeave(payload: unknown): boolean {
    return typeof payload === "object" && payload !== null && (payload as { k?: unknown }).k === "leave"
}

/** What a payload says, none when it says nothing this signaling knows. */
function sayOf(payload: unknown): Say|null {
    if(typeof payload !== "object" || payload === null) return null
    const fields = payload as {
        k?: unknown, result?: unknown, signal?: unknown, name?: unknown, host?: unknown,
    }
    switch(fields.k){
        case "knock":
        case "data":
            return payload as Say
        case "signal":
            return typeof fields.signal === "object" && fields.signal !== null ? payload as Say : null
        case "admit": {
            const isResult = fields.result === "yes" || fields.result === "no" || fields.result === "full"
            if(!isResult) return null
            const host = memberOf(fields.host)
            return {
                k: "admit", result: fields.result as "yes"|"no"|"full",
                name: typeof fields.name === "string" ? fields.name : undefined,
                host: host ?? undefined,
            }
        }
        default:
            return null
    }
}

function memberOf(value: unknown): Member|null {
    if(typeof value !== "object" || value === null) return null
    const fields = value as { id?: unknown, data?: unknown }
    return typeof fields.id === "string" ? { id: fields.id, data: (fields.data ?? null) as JsonValue } : null
}

function randomText(length: number): string {
    const bytes = crypto.getRandomValues(new Uint8Array(length))
    return Array.from(bytes, byte => ALPHABET[byte % ALPHABET.length]).join("")
}
