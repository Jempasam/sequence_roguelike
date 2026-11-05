import type { ChannelKind, ConnectionState } from "./Connection"
import { Listeners } from "./Listeners"
import type { NetError } from "./NetError"

/** A message heard on a connection. */
export interface Heard {
    readonly message: string
    readonly channel: ChannelKind
}

/**
 * What every {@link Connection} goes through, whatever carries it: connecting, open, then closed for good,
 * with the handlers told of each message and of the close.
 */
export class ConnectionLife {


    public state: ConnectionState = "connecting"
    public readonly opened: Promise<void>
    public readonly messages = new Listeners<Heard>()
    public readonly closes = new Listeners<NetError>()


    constructor(){
        let resolve!: () => void
        let reject!: (error: NetError) => void
        this.opened = new Promise((resolveOpened, rejectOpened) => {
            resolve = resolveOpened
            reject = rejectOpened
        })
        this.#resolve = resolve
        this.#reject = reject
        // A connection nobody awaits still reports its failure to its close handlers: this only keeps the
        // runtime from calling the rejection unhandled.
        this.opened.catch(() => {})
    }


    /** Open the connection, if it is still connecting. */
    public open(): void {
        if(this.state !== "connecting") return
        this.state = "open"
        this.#resolve()
    }

    /**
     * Close the connection for good, and tell why.
     *
     * @returns Whether it closed now, rather than being closed already.
     */
    public end(reason: NetError): boolean {
        if(this.state === "closed") return false
        this.state = "closed"
        this.#reason = reason
        this.#reject(reason)
        this.closes.emit(reason)
        // Cleared once told, so nothing holds on to the handlers of a connection that is over.
        this.closes.clear()
        this.messages.clear()
        return true
    }

    /** @throws {@link Error} When the connection is not open. */
    public ensureOpen(): void {
        if(this.state !== "open") throw new Error(`A message was sent on a connection that is ${this.state}.`)
    }

    /**
     * Tell a handler once the connection closes. One added to a connection closed already is told soon
     * after, never during the call, so it never waits forever and is never called before it is kept.
     */
    public onClose(handler: (reason: NetError) => void): { dispose(): void } {
        const reason = this.#reason
        if(!reason) return this.closes.add(handler)
        let isDisposed = false
        queueMicrotask(() => {
            if(!isDisposed) handler(reason)
        })
        return { dispose: () => { isDisposed = true } }
    }


    readonly #resolve: () => void
    readonly #reject: (error: NetError) => void

    /** Why the connection closed, none while it has not. */
    #reason: NetError|null = null
}
