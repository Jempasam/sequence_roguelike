import type { NetPort, SyncPort, SyncRole } from "../../platform"
import type { Connection } from "./Connection"
import { PTPClientSocket } from "./PTPClientSocket"
import { PTPHostSocket } from "./PTPHostSocket"

/** How many viewers a game takes when nothing else is asked. */
const DEFAULT_VIEWERS = 16

/**
 * The clients of one game over the network: the main client hosts a star room, and each viewer joins it
 * by its code. A viewer that connects is sent the messages retained at once, the last of each name, so it
 * starts from where the game is rather than waiting for the next one.
 *
 * @remarks
 * The port is made at once, while the room opens behind it: messages retained before a viewer is connected
 * are not lost to it, since they are sent again on connection, the latest last. {@link NetSync.ready} tells
 * when the room is open, and fails when it never opens.
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

    /** Watch a game hosted by another client, by the code of its room. */
    public static view(net: NetPort, url: string, code: string): NetSync {
        return new NetSync("viewer", PTPClientSocket.join(net, url, code))
    }


    /** Settles with the code of the room once it is open, or fails when it never opens. */
    public readonly ready: Promise<string>


    constructor(
        public readonly role: SyncRole,
        socket: Promise<PTPHostSocket|PTPClientSocket>,
    ){
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
     * @param retained - The name it stays under for a viewer to come, none for one that is not kept.
     * @throws {@link Error} On a viewer, which only listens.
     */
    public send(message: string, retained?: string): void {
        if(this.role !== "main") throw new Error("A viewer only listens, and sends nothing.")
        if(retained !== undefined){
            // Taken out first, so the messages stay in the order they were last sent.
            this.#retained.delete(retained)
            this.#retained.set(retained, message)
        }
        if(this.#socket instanceof PTPHostSocket) this.#socket.broadcast(message)
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

    /** The last message of each name, the latest last, which a viewer connecting is sent first. */
    readonly #retained = new Map<string, string>()

    readonly #handlers = new Set<{ handler: (message: string) => void }>()

    #serve(host: PTPHostSocket): void {
        host.onClient(({ connection }) => {
            for(const message of this.#retained.values()) connection.send(message)
        })
    }

    #watch(connection: Connection): void {
        connection.listen(message => {
            for(const { handler } of [...this.#handlers]) handler(message)
        })
    }
}
