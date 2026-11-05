import type { NetPort, SyncLink, SyncPeer, SyncPort, SyncRole, SyncRoom } from "../../platform"
import type { Connection } from "./Connection"
import { PTPClientSocket } from "./PTPClientSocket"
import { PTPHostSocket } from "./PTPHostSocket"

/** How many viewers a game takes when nothing else is asked. */
const DEFAULT_VIEWERS = 16

/**
 * The clients of one game over the network: the main client hosts a star room, and each viewer joins it
 * by its code. A viewer that connects is sent its first messages at once, read at that moment, so it starts
 * from where the game is rather than waiting for the next one.
 *
 * @remarks
 * The port is made at once, while the room opens behind it. {@link NetSync.ready} tells when the room is
 * open, and fails when it never opens.
 */
export class NetSync implements SyncPort {


    /**
     * Host a game for viewers.
     *
     * @param url - The address of the signaling server.
     * @param name - The name of the game, which viewers are told.
     */
    public static host(net: NetPort, url: string, name: string): NetSync {
        return new NetSync("main", PTPHostSocket.open(net, url, { name, capacity: DEFAULT_VIEWERS + 1 }))
    }

    /**
     * Watch a game hosted by another client, by the code of its room.
     *
     * @param guest - Does it come to play, and so speak to the host?
     */
    public static view(net: NetPort, url: string, code: string, guest = false): NetSync {
        return new NetSync("viewer", PTPClientSocket.join(net, url, code), guest)
    }


    /** Settles with the code of the room once it is open, or fails when it never opens. */
    public readonly ready: Promise<string>

    public readonly room: SyncRoom|null

    public readonly link: SyncLink|null


    constructor(
        public readonly role: SyncRole,
        socket: Promise<PTPHostSocket|PTPClientSocket>,

        /** Does a viewer speak to the main client? */
        guest = false,
    ){
        this.room = role === "main" ? {
            onJoin: handler => this.#joins.add(handler),
            onLeave: handler => this.#leaves.add(handler),
        } : null
        this.link = guest ? {
            send: message => this.#tell(message),
            listen: handler => this.listen(handler),
        } : null
        this.ready = socket.then(opened => {
            this.#socket = opened
            if(opened instanceof PTPHostSocket) this.#serve(opened)
            else this.#watch(opened)
            return opened.code
        })
    }


    /** How many viewers are connected to the main client, none on a viewer. */
    public get viewers(): number {
        if(!(this.#socket instanceof PTPHostSocket)) return 0
        return this.#socket.clients.filter(({ connection }) => connection.state === "open").length
    }

    /**
     * Send a message to every viewer connected.
     *
     * @throws {@link Error} On a viewer, which only listens.
     */
    public send(message: string): void {
        if(this.role !== "main") throw new Error("A viewer only listens, and sends nothing.")
        if(this.#socket instanceof PTPHostSocket) this.#socket.broadcast(message)
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
        this.#socket?.close()
        void this.ready.then(() => this.#socket?.close(), () => {})
    }


    #socket: PTPHostSocket|PTPClientSocket|null = null

    /** What gives a viewer connecting its first messages, in the order they were asked for. */
    readonly #peers = new Set<{ initial: () => string|null }>()

    readonly #handlers = new Set<{ handler: (message: string) => void }>()

    readonly #joins = new Handlers<SyncPeer>()
    readonly #leaves = new Handlers<SyncPeer>()

    /** The clients connected, by their id. */
    readonly #connected = new Map<string, SyncPeer>()

    /** What a viewer said before the main client could hear it. */
    readonly #unsent: string[] = []

    /** Did the main client speak yet? */
    #heard = false

    #serve(host: PTPHostSocket): void {
        host.onClient(({ member, connection }) => {
            const peer: SyncPeer = {
                id: member.id,
                send: message => connection.send(message),
                listen: handler => connection.listen(message => handler(message)),
            }
            this.#connected.set(peer.id, peer)
            // Told before the first messages: a client answering them finds the main client listening.
            this.#joins.tell(peer)
            for(const { initial } of [...this.#peers]){
                const message = initial()
                if(message !== null) connection.send(message)
            }
        })
        host.onLeave(({ id }) => {
            const peer = this.#connected.get(id)
            if(!peer) return
            this.#connected.delete(id)
            this.#leaves.tell(peer)
        })
    }

    #watch(connection: Connection): void {
        connection.listen(message => {
            this.#heard = true
            for(const unsent of this.#unsent.splice(0)) connection.send(unsent)
            for(const { handler } of [...this.#handlers]) handler(message)
        })
    }

    /**
     * Send a message to the main client, or keep it until the main client spoke: a connection opens on both
     * sides at its own pace, and what comes before the main client listens is lost.
     */
    #tell(message: string): void {
        if(this.#heard && this.#socket instanceof PTPClientSocket) this.#socket.send(message)
        else this.#unsent.push(message)
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
