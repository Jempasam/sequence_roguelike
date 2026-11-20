import type { Cancel, NetPort, TimerPort } from "../../platform"
import { ClientSocket } from "./ClientSocket"
import type { ConnectionState } from "./Connection"
import { Listeners } from "./Listeners"
import { NetError } from "./NetError"

/**
 * How often the server of PeerJS is told this client is alive, in milliseconds: it forgets a client that is
 * silent for 90 seconds.
 */
const HEARTBEAT = 5_000

/** The letters of the tokens made up. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

/** The kinds of messages a client says to another one, and the server relays. */
export type PeerJsKind = "OFFER"|"ANSWER"|"CANDIDATE"|"LEAVE"

/** What the server relays from another client, or tells about one: an `EXPIRE` says nobody read a message in time. */
export interface PeerJsRelayed {
    readonly type: string

    /** The id of the client the message is from, set by the server, so it cannot be forged. */
    readonly from: string
    readonly payload: unknown
}

/** How to reach a server of PeerJS, and under which id. */
export interface PeerJsConnectionOptions {
    readonly net: NetPort
    readonly timer: TimerPort

    /** The address of its WebSocket, `ws://host[:port]/[path/]peerjs` or `wss://`. */
    readonly endpoint: string

    /** The key of the server. */
    readonly key: string

    /** The id this client connects under: the server refuses it when another client holds it. */
    readonly id: string
}

/** What the server of PeerJS tells. */
interface WireMessage {
    readonly type: string
    readonly src?: string
    readonly payload?: unknown
}

interface Registration {
    resolve(connection: PeerJsConnection): void
    reject(error: NetError): void
}

/**
 * One client connected to a server of PeerJS under an id: the connection is the registration of the id, the
 * client is kept alive by a heartbeat, and what other clients say to it comes out as messages. It knows
 * nothing of what the messages mean.
 */
export class PeerJsConnection {


    /**
     * Connect under an id, and wait until the server accepts it.
     *
     * @throws {@link NetError} `"taken"` when another client holds the id, `"unreachable"` when the server
     *   cannot be reached or refuses this client.
     */
    public static open(options: PeerJsConnectionOptions): Promise<PeerJsConnection> {
        const { net, timer, endpoint, key, id } = options
        const query = `key=${encodeURIComponent(key)}&id=${encodeURIComponent(id)}&token=${randomToken()}`
        return new Promise<PeerJsConnection>((resolve, reject) => {
            new PeerJsConnection(timer, id, new ClientSocket(net, `${endpoint}?${query}`), { resolve, reject })
        })
    }


    private constructor(
        private readonly timer: TimerPort,
        public readonly id: string,
        socket: ClientSocket,
        registration: Registration,
    ){
        this.#socket = socket
        this.#registration = registration
        socket.listen(text => this.#hear(text))
        socket.onClose(reason => {
            if(this.#isRegistered) this.#end(reason)
            else this.#refuse(reason)
        })
    }


    public get state(): ConnectionState { return this.#socket.state }

    /** Say something to another client, which the server relays. Nothing is sent once the connection is not open. */
    public send(type: PeerJsKind, to: string, payload: unknown): void {
        if(this.#socket.state !== "open") return
        // The server sets the sender of what it relays, so the payload carries no `from`.
        this.#socket.send(JSON.stringify({ type, dst: to, payload: wrapped(type, payload) }))
    }

    /** Hear what the other clients say, from the registration on. */
    public onMessage(handler: (message: PeerJsRelayed) => void): { dispose(): void } {
        return this.#messages.add(handler)
    }

    /** Hear the end of the connection, even if it ended already. */
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
        this.#socket.close()
    }

    /** Close for a reason of this end, which is what the end of the connection tells. */
    public closeFor(reason: NetError): void {
        this.#socket.closeFor(reason)
    }


    readonly #socket: ClientSocket
    readonly #messages = new Listeners<PeerJsRelayed>()
    readonly #closed = new Listeners<NetError>()

    /** Settles the registration of the id, while the server has not said whether it is free. */
    #registration: Registration|null
    #isRegistered = false
    #beat: Cancel|null = null
    #ended: NetError|null = null

    #registered(): void {
        const registration = this.#registration
        if(!registration) return
        this.#registration = null
        this.#isRegistered = true
        this.#beat = this.timer.after(HEARTBEAT, () => this.#beats())
        registration.resolve(this)
    }

    /** The server did not accept the id: nothing of this connection is left. */
    #refuse(error: NetError): void {
        const registration = this.#registration
        if(!registration) return
        this.#registration = null
        this.#socket.close()
        registration.reject(error)
    }

    #beats(): void {
        if(this.#socket.state !== "open") return
        this.#socket.send(JSON.stringify({ type: "HEARTBEAT" }))
        this.#beat = this.timer.after(HEARTBEAT, () => this.#beats())
    }

    #hear(text: string): void {
        let message: WireMessage
        try {
            const parsed: unknown = JSON.parse(text)
            if(typeof parsed !== "object" || parsed === null || typeof (parsed as WireMessage).type !== "string") return
            message = parsed as WireMessage
        } catch{
            return
        }
        switch(message.type){
            case "OPEN":
                this.#registered()
                return
            case "ID-TAKEN":
                this.#refuse(new NetError("taken", `The id ${this.id} is held by another client.`))
                return
            case "ERROR":
            case "INVALID-KEY":
                this.#refuse(new NetError("unreachable", `The relay refused this client: ${describe(message.payload)}`))
                return
            default:
                break
        }
        // The server tells who sent a message, which a client cannot forge: the payload is not asked.
        const from = message.src
        if(typeof from !== "string" || !this.#isRegistered) return
        this.#messages.emit({ type: message.type, from, payload: message.payload })
    }

    /** The connection ended: the heartbeat stops and everything that listens is told. */
    #end(reason: NetError): void {
        if(this.#ended) return
        this.#ended = reason
        this.#beat?.cancel()
        this.#beat = null
        this.#messages.clear()
        this.#closed.emit(reason)
        this.#closed.clear()
    }
}

/**
 * The payload of a message, with what a server of PeerJS asks of it to relay it. The public one closes the
 * sender of an `OFFER`, `ANSWER` or `CANDIDATE` whose payload does not have the fields a PeerJS client puts in:
 * a `sdp` that is a text ending by a line break, a `type`, a `connectionId`, and for an offer a `label` and a
 * `serialization`. The fields are only filled, nothing reads them: what the message says stays in the rest.
 */
function wrapped(type: PeerJsKind, payload: unknown): unknown {
    if(typeof payload !== "object" || payload === null) return payload
    const common = { type: "data", connectionId: "dc_game" }
    switch(type){
        case "OFFER":
            return { sdp: { type: "offer", sdp: "v=0\r\n" }, label: "game", serialization: "json", ...common, ...payload }
        case "ANSWER":
            return { sdp: { type: "answer", sdp: "v=0\r\n" }, ...common, ...payload }
        case "CANDIDATE":
            return { candidate: { candidate: "" }, ...common, ...payload }
        default:
            return payload
    }
}

function describe(payload: unknown): string {
    const msg = typeof payload === "object" && payload !== null ? (payload as { msg?: unknown }).msg : undefined
    return typeof msg === "string" ? msg : "no reason given."
}

function randomToken(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, byte => ALPHABET[byte % ALPHABET.length]).join("")
}
