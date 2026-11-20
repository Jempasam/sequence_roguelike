import type { NetPort, SyncLink, SyncPeer, SyncPort, SyncRole, SyncRoom, TimerPort } from "../../platform"
import { Fault } from "./Fault"
import { Listeners } from "./Listeners"
import { NotHostFault, OutboxFullFault } from "./NetFaults"
import { Outbox } from "./Outbox"
import { PTPClientSocket } from "./PTPClientSocket"
import { QueuedPeer } from "./QueuedPeer"
import { SessionClient } from "./SessionClient"
import { SessionHost } from "./SessionHost"
import type { SessionPeer } from "./SessionPeer"
import type { SignalingConnector } from "./Signaling"

/** How many viewers a game takes when nothing else is asked. */
const DEFAULT_VIEWERS = 16

/** How long a client lost may come back to its session, in milliseconds. */
const GRACE_MS = 60_000

/** How long a client waits between two tries to come back, in milliseconds. */
const RETRY_MS = 2_000

/**
 * The clients of one game over the network: the main client hosts a star room, and each viewer joins it
 * by its code. A viewer that connects is sent its first messages at once, read at that moment, so it starts
 * from where the game is rather than waiting for the next one. A viewer whose connection drops comes back
 * on the same session, and is sent its first messages again.
 *
 * @remarks
 * The port is made at once, while the room opens behind it. {@link NetSync.ready} tells when the room is
 * open, and settles with a {@link Fault} when it never opens: nothing here throws, and no promise rejects.
 */
export class NetSync implements SyncPort {


    /**
     * Host a game for viewers.
     *
     * @param connect - Reaches the signaling server.
     * @param name - The name of the game, which viewers are told.
     */
    public static host(net: NetPort, connect: SignalingConnector, name: string, timer: TimerPort): NetSync {
        const host = SessionHost.open(net, connect, { name, capacity: DEFAULT_VIEWERS + 1 }, {
            graceMs: GRACE_MS,
            timer,
        })
        return new NetSync("main", host)
    }

    /**
     * Watch a game hosted by another client, by the code of its room.
     *
     * @param connect - Reaches the signaling server.
     * @param guest - Does it come to play, and so speak to the host?
     */
    public static view(
        net: NetPort,
        connect: SignalingConnector,
        code: string,
        timer: TimerPort,
        guest = false,
    ): NetSync {
        const client = new SessionClient(data => PTPClientSocket.join(net, connect, code, { data }), {
            timer,
            graceMs: GRACE_MS,
            retryMs: RETRY_MS,
        })
        return new NetSync("viewer", client, code, guest)
    }


    /** Settles with the code of the room once it is open, or with why it never opened. It never rejects. */
    public readonly ready: Promise<string|Fault>

    public readonly room: SyncRoom|null

    public readonly link: SyncLink|null

    /** Told of what was dealt with: a viewer that tried to send, a client lost. */
    public readonly faulted = new Listeners<Fault>()

    /** Told once, when the room cannot go on: it was lost, or the client cannot come back. */
    public readonly ended = new Listeners<Fault>()

    /** Told each time a viewer lost its connection and tries to come back, none on the main client. */
    public readonly reconnecting = new Listeners<void>()

    /** Told each time a viewer came back, none on the main client. */
    public readonly reconnected = new Listeners<void>()

    private constructor(
        public readonly role: SyncRole,
        source: Promise<SessionHost|Fault>|SessionClient,
        code = "",

        /** Does a viewer speak to the main client? */
        guest = false,
    ){
        this.room = role === "main" ? {
            onJoin: handler => this.#joins.add(handler),
            onLost: handler => this.#losses.add(handler),
            onBack: handler => this.#backs.add(handler),
            onLeave: handler => this.#leaves.add(handler),
        } : null
        this.link = guest ? {
            send: message => this.#tell(message),
            listen: handler => this.listen(handler),
        } : null
        if(source instanceof SessionClient) this.ready = this.#watch(source, code)
        else this.ready = source.then(opened => this.#serve(opened))
    }


    /** How many viewers are connected to the main client, none on a viewer. */
    public get viewers(): number {
        return this.#host?.peers.filter(peer => !peer.isLost).length ?? 0
    }

    /**
     * Send a message to every viewer connected. On a viewer, which only listens, nothing is sent and the
     * attempt is told as a {@link NotHostFault}.
     */
    public send(message: string): void {
        if(this.role !== "main"){
            this.faulted.emit(new NotHostFault())
            return
        }
        for(const peer of this.#host?.peers ?? []) this.#queued(peer).send(message)
    }

    public onPeer(initial: () => string|null): { dispose(): void } {
        const entry = { initial }
        this.#peers.add(entry)
        return { dispose: () => this.#peers.delete(entry) }
    }

    public listen(handler: (message: string) => void): { dispose(): void } {
        const entry = { handler }
        this.#handlers.add(entry)
        return { dispose: () => this.#handlers.delete(entry) }
    }

    /** Close the room, or leave it. */
    public close(): void {
        this.#isClosed = true
        this.#host?.close()
        this.#client?.close()
    }


    #host: SessionHost|null = null
    #client: SessionClient|null = null

    /** What gives a viewer connecting its first messages, in the order they were asked for. */
    readonly #peers = new Set<{ initial: () => string|null }>()

    readonly #handlers = new Set<{ handler: (message: string) => void }>()

    readonly #joins = new Handlers<SyncPeer>()
    readonly #losses = new Handlers<SyncPeer>()
    readonly #backs = new Handlers<SyncPeer>()
    readonly #leaves = new Handlers<SyncPeer>()

    /** Each client of the main client, as the game sees it, by the id of its session. */
    readonly #clients = new Map<string, QueuedPeer>()

    /**
     * What a viewer said while it could not be heard: before the main client spoke, for a connection opens on
     * both sides at its own pace, or while its connection is lost.
     */
    readonly #unsent = new Outbox()

    /** Did the main client speak yet? */
    #heard = false

    /** Was it closed, perhaps before its room opened? */
    #isClosed = false

    #serve(host: SessionHost|Fault): string|Fault {
        if(host instanceof Fault){
            this.ended.emit(host)
            return host
        }
        this.#host = host
        if(this.#isClosed) host.close()
        host.faulted.add(fault => this.faulted.emit(fault))
        host.ended.add(fault => this.ended.emit(fault))
        host.peerJoined.add(peer => {
            const client = this.#queued(peer)
            // Told before the first messages: a client answering them finds the main client listening.
            this.#joins.tell(client)
            this.#greet(client)
        })
        host.peerLost.add(peer => this.#losses.tell(this.#queued(peer)))
        host.peerBack.add(peer => {
            const client = this.#queued(peer)
            // What was said while it was away comes first, then what the game knows it came back to hear.
            client.flush()
            this.#backs.tell(client)
            this.#greet(client)
        })
        host.peerGone.add(peer => {
            const client = this.#queued(peer)
            client.forget()
            this.#clients.delete(peer.id)
            this.#leaves.tell(client)
        })
        return host.code
    }

    /** The client of a session as the game sees it, the same one each time. */
    #queued(peer: SessionPeer): QueuedPeer {
        const known = this.#clients.get(peer.id)
        if(known) return known
        const made = new QueuedPeer(peer, fault => this.faulted.emit(fault))
        this.#clients.set(peer.id, made)
        return made
    }

    /** Give a viewer its first messages, at once. */
    #greet(client: QueuedPeer): void {
        for(const { initial } of [...this.#peers]){
            const message = initial()
            if(message !== null) client.send(message)
        }
    }

    async #watch(client: SessionClient, code: string): Promise<string|Fault> {
        this.#client = client
        client.faulted.add(fault => this.faulted.emit(fault))
        client.reconnecting.add(() => this.reconnecting.emit())
        client.reconnected.add(() => {
            // The main client already listens to this session: what was said while away goes at once.
            this.#flush()
            this.reconnected.emit()
        })
        client.link.listen(message => {
            this.#heard = true
            this.#flush()
            for(const { handler } of [...this.#handlers]) handler(message)
        })
        const ended = new Promise<Fault>(resolve => {
            client.ended.add(fault => {
                this.ended.emit(fault)
                resolve(fault)
            })
        })
        await client.connect()
        return client.isConnected ? code : ended
    }

    /**
     * Send a message to the main client, or keep it until it can be heard: until the main client spoke, for a
     * connection opens on both sides at its own pace and what comes before the main client listens is lost,
     * and while the connection is lost.
     */
    #tell(message: string): void {
        const client = this.#client
        if(this.#heard && client?.isConnected) client.link.send(message)
        else if(this.#unsent.hold(message)) this.faulted.emit(new OutboxFullFault(null))
    }

    /** Send what was kept, in order, now that it can be heard. */
    #flush(): void {
        const client = this.#client
        if(!client?.isConnected) return
        this.#unsent.drain(message => client.link.send(message))
    }
}

/** What hears something, each until its handle is disposed. */
class Handlers<T> {


    public add(handler: (value: T) => void): { dispose(): void } {
        const entry = { handler }
        this.#entries.add(entry)
        return { dispose: () => this.#entries.delete(entry) }
    }

    public tell(value: T): void {
        for(const { handler } of [...this.#entries]) handler(value)
    }


    readonly #entries = new Set<{ handler: (value: T) => void }>()
}
