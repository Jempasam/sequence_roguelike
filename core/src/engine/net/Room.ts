import type { JsonValue, Member, PeerSignal, RoomShape } from "@game/server/protocol"

import type { NetPort, TimerPort } from "../../platform"
import { Listeners } from "./Listeners"
import { NetError } from "./NetError"
import { PeerConnection } from "./PeerConnection"
import type { OpenDeadline, PeerRole } from "./PeerConnection"
import type { RoomEntry, RoomEvent, Signaling, SignalingConnector } from "./Signaling"

/** The most members a room holds when nothing else is asked: a mesh of 8 opens 28 connections. */
export const DEFAULT_CAPACITY = 8

/** How long a connection to a member may take to open, in milliseconds, when a timer is given. */
export const DEFAULT_OPEN_TIMEOUT = 15_000

/** What a room needs to measure time: the deadlines of its connections. */
export interface RoomTiming {
    /** Where time goes, for the connections to have a deadline. */
    readonly timer?: TimerPort

    /**
     * How long a connection to a member may take to open before it is given up, in milliseconds. It is
     * {@link DEFAULT_OPEN_TIMEOUT} when there is a timer, and there is no deadline without one.
     */
    readonly openTimeout?: number
}

/**
 * Whether the owner of a room lets a newcomer in, from what it says about itself. It may take its time,
 * to ask the player for instance.
 */
export type Admission = (member: Member) => boolean|Promise<boolean>

/** A member of a room this one is linked to, and the connection to it. */
export interface Peer {
    readonly member: Member
    readonly connection: PeerConnection
}

/** What a room is created with. */
export interface RoomOptions extends RoomTiming {
    /** The name of the room, which every member is told. */
    readonly name: string

    /** The code of the room, for others to find it beforehand. One is made up when there is none. */
    readonly code?: string

    /** What this member says about itself, which every member linked to it reads. */
    readonly data?: JsonValue

    /** The most members the room holds, its owner included. */
    readonly capacity?: number

    /** Whether to let a newcomer in, while this member owns the room. Everyone is let in by default. */
    readonly admit?: Admission
}

/** What a room is joined with. */
export interface JoinOptions extends RoomTiming {
    /** What this member says about itself, which every member linked to it reads. */
    readonly data?: JsonValue

    /** Whether to let a newcomer in, should this member come to own the room. Everyone by default. */
    readonly admit?: Admission
}

/**
 * The members of a room this one is linked to, and a WebRTC connection to each, which the room makes as the
 * signaling server tells of them. A star and a mesh differ only in whom the server tells of.
 *
 * @remarks
 * A newcomer offers a connection to each member it is told of on entering, and a member told of a newcomer
 * waits for its offer: the two sides never offer at once.
 *
 * The room lives as long as its signaling client: losing the server closes the room and every connection
 * of it, even those that were open, so a room is never left half alive with no way to take newcomers.
 */
export class Room {


    /**
     * Create a room on a signaling server, and own it.
     *
     * @param connect - Reaches the signaling, whichever it is: a relay of peer ids holds stars only.
     * @throws {@link NetError} When the server cannot be reached, or the code asked for is taken (`"taken"`).
     * @throws {@link Error} When the signaling cannot hold a room of this shape.
     */
    public static async create(
        net: NetPort,
        connect: SignalingConnector,
        shape: RoomShape,
        options: RoomOptions,
    ): Promise<Room> {
        const client = await connect()
        const entry = await entered(client, client.create({
            shape,
            name: options.name,
            data: options.data ?? null,
            capacity: options.capacity ?? DEFAULT_CAPACITY,
            ...options.code === undefined ? {} : { code: options.code },
        }))
        return new Room(net, client, entry, options)
    }

    /**
     * Enter a room by its code, once its owner lets this member in.
     *
     * @throws {@link NetError} When the room is not found, full, or refuses, or the server cannot be reached.
     */
    public static async join(
        net: NetPort,
        connect: SignalingConnector,
        code: string,
        options: JoinOptions = {},
    ): Promise<Room> {
        const client = await connect()
        const entry = await entered(client, client.join(code, options.data ?? null))
        return new Room(net, client, entry, options)
    }


    /** The code of the room, which a player gives the others to let them join. */
    public readonly code: string
    public readonly name: string
    public readonly shape: RoomShape


    constructor(
        net: NetPort,
        client: Signaling,
        entry: RoomEntry,
        options: Pick<RoomOptions, "admit"|"timer"|"openTimeout"> = {},
    ){
        this.#net = net
        this.#client = client
        this.#admit = options.admit ?? (() => true)
        if(options.timer){
            this.#deadline = { timer: options.timer, ms: options.openTimeout ?? DEFAULT_OPEN_TIMEOUT }
        }
        this.code = entry.code
        this.name = entry.name
        this.shape = entry.shape
        this.#self = entry.self
        this.#owner = entry.owner
        this.#listening = client.onEvent(event => this.#hear(event))
        client.onClose(reason => this.#end(reason))
        for(const member of entry.members) this.#link(member, "offerer")
    }


    /** This member, as the others know it. */
    public get self(): Member { return this.#self }

    /** The id of the member that owns the room and admits newcomers. */
    public get owner(): string { return this.#owner }

    public get isOwner(): boolean { return this.#owner === this.#self.id }

    /** Is the room still open? It never opens again once closed. */
    public get isOpen(): boolean { return this.#reason === null }

    /** The members linked to this one, whether their connection is open yet or not. */
    public get peers(): readonly Peer[] {
        return [...this.#peers.values()]
    }

    /** The member of this id, linked to this one, none when there is none. */
    public peer(id: string): Peer|null {
        return this.#peers.get(id) ?? null
    }

    /** Be told of each member whose connection opens, until the returned handle is disposed. */
    public onPeer(handler: (peer: Peer) => void): { dispose(): void } {
        return this.#opened.add(handler)
    }

    /** Be told of each linked member that leaves the room, or whose connection is lost. */
    public onLeave(handler: (member: Member) => void): { dispose(): void } {
        return this.#left.add(handler)
    }

    /** Be told of each linked member that changes what it says about itself. */
    public onChange(handler: (member: Member) => void): { dispose(): void } {
        return this.#changed.add(handler)
    }

    /** Be told once the room closes for this member, with why. */
    public onClose(handler: (reason: NetError) => void): { dispose(): void } {
        return this.#closed.add(handler)
    }

    /** Change what this member says about itself, which every linked member is told. */
    public setData(data: JsonValue): void {
        this.#self = { id: this.#self.id, data }
        this.#client.setData(data)
    }

    /** Leave the room: every connection of it closes. Doing it twice changes nothing. */
    public close(): void {
        this.#client.close()
    }


    readonly #net: NetPort
    readonly #client: Signaling
    readonly #admit: Admission
    readonly #deadline: OpenDeadline|undefined
    readonly #listening: { dispose(): void }
    #self: Member
    #owner: string

    /** Why the room closed, none while it is open. */
    #reason: NetError|null = null

    readonly #peers = new Map<string, Peer>()

    /** The signals of each linked member, which its connection listens to. */
    readonly #signals = new Map<string, Listeners<PeerSignal>>()

    readonly #opened = new Listeners<Peer>()
    readonly #left = new Listeners<Member>()
    readonly #changed = new Listeners<Member>()
    readonly #closed = new Listeners<NetError>()

    #hear(event: RoomEvent): void {
        switch(event.type){
            case "knocking":
                this.#answer(event.member)
                break
            case "joined":
                this.#link(event.member, "answerer")
                break
            case "left":
                this.#unlink(event.member)
                break
            case "changed": {
                const peer = this.#peers.get(event.member.id)
                if(!peer) break
                this.#peers.set(event.member.id, { member: event.member, connection: peer.connection })
                this.#changed.emit(event.member)
                break
            }
            case "owner":
                this.#owner = event.member
                break
            case "signal": {
                const signals = this.#signals.get(event.from)
                // A link that failed and was dropped may still hear late candidates: no one takes them.
                if(signals) signals.emit(event.signal)
                break
            }
            default:
                break
        }
    }

    /**
     * Let a newcomer in or not, by the word of the admission. One that throws turns the newcomer away, and
     * its error is thrown again, out of the event, so it is seen rather than lost.
     */
    #answer(member: Member): void {
        void Promise.resolve()
            .then(() => this.#admit(member))
            .then(accepted => {
                if(this.isOpen) this.#client.admit(member.id, accepted)
            }, error => {
                if(this.isOpen) this.#client.admit(member.id, false)
                throw error
            })
    }

    #link(member: Member, role: PeerRole): void {
        const signals = new Listeners<PeerSignal>()
        this.#signals.set(member.id, signals)
        const connection = new PeerConnection(this.#net, this.#client.iceServers, member.id, role, {
            send: signal => {
                if(this.isOpen) this.#client.signal(member.id, signal)
            },
            listen: handler => signals.add(handler),
        }, this.#deadline)
        this.#peers.set(member.id, { member, connection })
        void connection.opened.then(() => {
            const peer = this.#peers.get(member.id)
            if(peer?.connection === connection) this.#opened.emit(peer)
        }, () => {})
        connection.onClose(() => {
            if(this.#peers.get(member.id)?.connection === connection) this.#unlink(member.id)
        })
    }

    #unlink(id: string): void {
        const peer = this.#peers.get(id)
        if(!peer) return
        this.#peers.delete(id)
        this.#signals.delete(id)
        peer.connection.close()
        this.#left.emit(peer.member)
    }

    #end(reason: NetError): void {
        if(this.#reason) return
        this.#reason = reason
        this.#listening.dispose()
        // Emptied first, so closing the connections does not report every member as leaving.
        const peers = [...this.#peers.values()]
        this.#peers.clear()
        this.#signals.clear()
        for(const peer of peers) peer.connection.close()
        this.#closed.emit(reason)
        for(const listeners of [this.#opened, this.#left, this.#changed, this.#closed]) listeners.clear()
    }
}

/** The entry into a room, the client disconnected when it fails, since a client is for one room. */
async function entered(client: Signaling, entry: Promise<RoomEntry>): Promise<RoomEntry> {
    try {
        return await entry
    } catch(error){
        client.close()
        throw error
    }
}
