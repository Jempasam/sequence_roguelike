import { signal } from "../../lifetime"
import type { Member } from "@game/server/protocol"

import type { Cancel, NetPort, SyncRoom, TimerPort } from "../../platform"
import type { Connection } from "./Connection"
import type { Fault } from "./Fault"
import {
    BadSecretFault, HostLostServerFault, SessionExpiredFault, VersionMismatchFault, faultOf,
} from "./NetFaults"
import type { NetError } from "./NetError"
import { PTPHostSocket } from "./PTPHostSocket"
import { readSession, SESSION_VERSION } from "./Session"
import type { SignalingConnector } from "./Signaling"
import { SessionPeer } from "./SessionPeer"
import type { Admission, RoomOptions } from "./Room"
import type { Removable } from "../../lifetime"

/** A client let in: who it says it is, and the connection to it. */
export interface SessionLink {
    readonly member: Member
    readonly connection: Connection
}

/** What a {@link SessionHost} stands on: a {@link PTPHostSocket}, or anything telling the same. */
export interface SessionSocket {
    /** The code clients join the room with. */
    readonly code: string

    /** Be told of each client whose connection opens. */
    onClient(handler: (client: SessionLink) => void): Removable

    /** Be told of each client that leaves, or whose connection is lost. */
    onLeave(handler: (client: Member) => void): Removable

    /** Be told once the room closes. */
    onClose(handler: (reason: NetError) => void): Removable

    close(): void
}

/** What a {@link SessionHost} is made with. */
export interface SessionHostOptions {
    /** How long a client lost may come back, in milliseconds, before it is gone for good. */
    readonly graceMs: number

    readonly timer: TimerPort

    /** The version of the sessions it speaks, the current one by default. */
    readonly version?: number

    /** Whether to let a newcomer in, once its session is. Everyone is let in by default. */
    readonly admit?: Admission
}

/**
 * The host of a game whose clients survive a connection that drops: a client comes with a session it drew
 * itself, and a client coming back with the same id and secret takes the place of the one lost, on the same
 * {@link SessionPeer}.
 *
 * @remarks
 * Nothing here throws. What the layer below throws is caught where the host opens, and told as a
 * {@link Fault}: `faulted` when it was dealt with (a client refused, one claiming a session it does not
 * hold), `ended` when the host cannot go on (the signaling server is lost, so the room closes).
 *
 * A client that left on purpose is not told apart from one whose connection dropped: both are lost, then
 * gone once the grace passed.
 */
export class SessionHost {


    /**
     * Open a room on a signaling server, and host sessions in it.
     *
     * @param room - What the room is made with, the admission aside, which the sessions make.
     * @returns The host, or why the room could not be opened. It never rejects.
     */
    public static async open(
        net: NetPort,
        connect: SignalingConnector,
        room: Omit<RoomOptions, "admit">,
        options: SessionHostOptions,
    ): Promise<SessionHost|Fault> {
        let hosting: SessionHost|null = null
        const admit: Admission = member => hosting ? hosting.admit(member) : false
        try {
            const socket = await PTPHostSocket.open(net, connect, { ...room, admit })
            hosting = new SessionHost(socket, options)
            return hosting
        } catch(error){
            return faultOf(error)
        }
    }


    /** Told of each client that comes for the first time. */
    public readonly peerJoined = signal<SessionPeer>()

    /** Told of each client whose connection is lost: it may come back. */
    public readonly peerLost = signal<SessionPeer>()

    /** Told of each client that came back on a new connection. */
    public readonly peerBack = signal<SessionPeer>()

    /** Told of each client that did not come back in time, or never will. */
    public readonly peerGone = signal<SessionPeer>()

    /** Told of what was dealt with: a client refused, a session claimed with a wrong secret. */
    public readonly faulted = signal<Fault>()

    /** Told once, when the host cannot go on. */
    public readonly ended = signal<Fault>()

    constructor(
        private readonly socket: SessionSocket,
        private readonly options: SessionHostOptions,
    ){
        this.#handles = [
            socket.onClient(client => this.#connected(client)),
            socket.onLeave(member => this.#left(member)),
            socket.onClose(() => this.#closed()),
        ]
    }


    /** The code clients join the room with. */
    public get code(): string { return this.socket.code }

    /** The clients, those lost and not gone included. */
    public get peers(): readonly SessionPeer[] {
        return [...this.#peers.values()]
    }

    /** The clients as the sync of a game sees them: what it hears of them is told of the sessions. */
    public get room(): SyncRoom {
        return {
            onJoin: handler => this.peerJoined.add(handler),
            onLost: handler => this.peerLost.add(handler),
            onBack: handler => this.peerBack.add(handler),
            onLeave: handler => this.peerGone.add(handler),
        }
    }

    /**
     * Whether a client is let in: the version and the session it comes with are checked, then the admission
     * it was given, if any. A refusal is told as a fault.
     */
    public admit(member: Member): boolean|Promise<boolean> {
        const ours = this.options.version ?? SESSION_VERSION
        const session = readSession(member.data)
        if(!session){
            this.faulted.notify(new VersionMismatchFault(member.id, null, ours))
            return false
        }
        if(session.version !== ours){
            this.faulted.notify(new VersionMismatchFault(session.id, session.version, ours))
            return false
        }
        if(this.#gone.has(session.id)){
            this.faulted.notify(new SessionExpiredFault(session.id))
            return false
        }
        const known = this.#secrets.get(session.id)
        if(known !== undefined && known !== session.secret){
            this.faulted.notify(new BadSecretFault(session.id))
            return false
        }
        this.#secrets.set(session.id, session.secret)
        return this.options.admit ? this.options.admit(member) : true
    }

    /** Close the room: every client leaves with it, and no one is waited for. */
    public close(): void {
        this.#stop()
        this.socket.close()
    }


    readonly #handles: readonly Removable[]

    /** The clients, by the id of their session. */
    readonly #peers = new Map<string, SessionPeer>()

    /** The secret of each session let in, by its id. */
    readonly #secrets = new Map<string, string>()

    /** The sessions over: a client claiming one is refused. */
    readonly #gone = new Set<string>()

    /** What waits for a client lost to come back, by the id of its session. */
    readonly #waits = new Map<string, Cancel>()

    #isStopped = false

    #connected({ member, connection }: SessionLink): void {
        const session = readSession(member.data)
        if(!session || this.#secrets.get(session.id) !== session.secret){
            connection.close()
            return
        }
        const peer = this.#peers.get(session.id)
        if(!peer){
            const created = new SessionPeer(session.id, member.id, connection)
            this.#peers.set(session.id, created)
            this.peerJoined.notify(created)
            return
        }
        this.#waits.get(session.id)?.cancel()
        this.#waits.delete(session.id)
        peer.markBack(member.id, connection)
        this.peerBack.notify(peer)
    }

    #left(member: Member): void {
        const peer = [...this.#peers.values()].find(each => each.member === member.id)
        if(!peer || peer.isLost) return
        peer.markLost()
        this.peerLost.notify(peer)
        this.#waits.set(peer.id, this.options.timer.after(this.options.graceMs, () => this.#goneFor(peer)))
    }

    #goneFor(peer: SessionPeer): void {
        this.#waits.delete(peer.id)
        if(this.#peers.get(peer.id) !== peer) return
        this.#peers.delete(peer.id)
        this.#secrets.delete(peer.id)
        this.#gone.add(peer.id)
        peer.close()
        this.peerGone.notify(peer)
    }

    #closed(): void {
        if(this.#isStopped) return
        this.#stop()
        this.ended.notify(new HostLostServerFault())
    }

    /**
     * Wait for no one, and hear no more: the clients are let go, their connections closed. What listens is
     * told by `close` or `ended`, not peer by peer.
     */
    #stop(): void {
        this.#isStopped = true
        for(const handle of this.#handles) handle.remove()
        for(const wait of this.#waits.values()) wait.cancel()
        this.#waits.clear()
        const peers = [...this.#peers.values()]
        this.#peers.clear()
        this.#secrets.clear()
        for(const peer of peers) peer.close()
    }
}
