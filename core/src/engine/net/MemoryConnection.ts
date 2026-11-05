import type { ChannelKind, Connection, ConnectionState } from "./Connection"
import { ConnectionLife } from "./ConnectionLife"
import { NetError } from "./NetError"

/**
 * One end of a connection within the program: what the player who hosts uses to reach its own host, and
 * what tests link two ends with. Messages arrive soon after they are sent, never during the call, as they
 * would over a network, and none is ever lost.
 */
export class MemoryConnection implements Connection {


    /** Two ends linked to each other, open soon after. */
    public static pair(): readonly [MemoryConnection, MemoryConnection] {
        const a = new MemoryConnection()
        const b = new MemoryConnection()
        a.#other = b
        b.#other = a
        queueMicrotask(() => {
            a.#life.open()
            b.#life.open()
        })
        return [a, b]
    }


    public get state(): ConnectionState { return this.#life.state }
    public get opened(): Promise<void> { return this.#life.opened }

    public send(message: string, channel: ChannelKind = "reliable"): void {
        this.#life.ensureOpen()
        const other = this.#other
        if(other) queueMicrotask(() => other.#life.messages.emit({ message, channel }))
    }

    public listen(handler: (message: string, channel: ChannelKind) => void): { dispose(): void } {
        return this.#life.messages.add(({ message, channel }) => handler(message, channel))
    }

    public onClose(handler: (reason: NetError) => void): { dispose(): void } {
        return this.#life.onClose(handler)
    }

    /** Close both ends. Closing twice does nothing. */
    public close(): void {
        if(!this.#life.end(new NetError("closed", "This end closed the connection."))) return
        const other = this.#other
        if(other) other.#life.end(new NetError("closed", "The other end closed the connection."))
    }


    readonly #life = new ConnectionLife()
    #other: MemoryConnection|null = null
}
