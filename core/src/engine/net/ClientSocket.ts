import type { NetPort } from "../../platform"
import type { ChannelKind, Connection, ConnectionState } from "./Connection"
import { ConnectionLife } from "./ConnectionLife"
import { NetError } from "./NetError"

/** The WebSocket close code of a close on purpose. */
const NORMAL_CLOSURE = 1000

/** The WebSocket close code of an end that broke the protocol. */
const PROTOCOL_ERROR = 1002

/** The WebSocket close code of an end that refused data it does not take, such as binary for text. */
const UNSUPPORTED_DATA = 1003

/**
 * A connection to a server whose address is known, over a WebSocket: the client asks, the server answers.
 * A WebSocket has a single channel, ordered and reliable, so unreliable messages go by it too.
 */
export class ClientSocket implements Connection {


    constructor(
        net: NetPort,

        /** The address of the server, `ws://` or `wss://`. */
        public readonly url: string,
    ){
        const socket = net.openWebSocket(url)
        this.#socket = socket
        socket.onopen = () => this.#life.open()
        socket.onmessage = event => {
            if(typeof event.data === "string") this.#life.messages.emit({ message: event.data, channel: "reliable" })
            else this.closeFor(new NetError("protocol", "The server sent binary data, where only text is heard."))
        }
        socket.onclose = event => this.#life.end(reasonOf(event.code, event.reason, url, this.#life.state === "open"))
        // The close event always follows, with more to say than the error event, which carries nothing.
        socket.onerror = () => {}
    }


    public get state(): ConnectionState { return this.#life.state }
    public get opened(): Promise<void> { return this.#life.opened }

    /** Send a message to the server, by the single channel of the WebSocket whatever channel is asked. */
    public send(message: string): void {
        this.#life.ensureOpen()
        this.#socket.send(message)
    }

    public listen(handler: (message: string, channel: ChannelKind) => void): { dispose(): void } {
        return this.#life.messages.add(({ message, channel }) => handler(message, channel))
    }

    public onClose(handler: (reason: NetError) => void): { dispose(): void } {
        return this.#life.onClose(handler)
    }

    public close(): void {
        this.#life.end(new NetError("closed", `The connection to ${this.url} was closed by this end.`))
        this.#socket.close(NORMAL_CLOSURE)
    }

    /**
     * Close the connection for a reason of this end: the server broke the protocol, or said it is over. A
     * browser only lets a client close with 1000 or a code of its own, so the server hears a normal close.
     */
    public closeFor(reason: NetError): void {
        this.#life.end(reason)
        this.#socket.close(NORMAL_CLOSURE)
    }


    readonly #socket: WebSocket
    readonly #life = new ConnectionLife()
}

function reasonOf(code: number, reason: string, url: string, wasOpen: boolean): NetError {
    if(!wasOpen) return new NetError("unreachable", `${url} could not be reached.`)
    const said = reason === "" ? "" : `: ${reason}`
    switch(code){
        case NORMAL_CLOSURE:
            return new NetError("closed", `${url} closed the connection${said}.`)
        case PROTOCOL_ERROR:
        case UNSUPPORTED_DATA:
            return new NetError("protocol", `${url} refused what this end sent${said}.`)
        default:
            return new NetError("unreachable", `The connection to ${url} was lost (${code})${said}.`)
    }
}
