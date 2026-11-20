import type { SyncPeer } from "../../platform"
import type { Connection } from "./Connection"
import { Listeners } from "./Listeners"

/**
 * A client of a {@link SessionHost}, as it stays the same through the connections it comes with: its id is
 * the one of its session, and what listens to it keeps hearing it when it comes back on a new connection.
 *
 * @remarks
 * While its connection is lost, what is sent to it is dropped: the host tells what a client came back to
 * hear again, rather than keeping a queue it cannot size. Sending on a connection that closes meanwhile is
 * dropped too, since the host tells of that loss by `lost` right after.
 */
export class SessionPeer implements SyncPeer {


    /** Told once its connection is lost: it may come back. */
    public readonly lost = new Listeners<void>()

    /** Told once it came back on a new connection. */
    public readonly back = new Listeners<void>()

    constructor(
        /** The id of its session. */
        public readonly id: string,

        /** The id of the member of the room it is, the connection it comes with changing it. */
        member: string,

        connection: Connection,
    ){
        this.#member = member
        this.#attach(connection)
    }


    /** The id of the member of the room that is now its connection. */
    public get member(): string { return this.#member }

    /** Is its connection lost, and not back yet? */
    public get isLost(): boolean { return this.#isLost }

    public send(message: string): void {
        if(this.#isLost || !this.#connection) return
        try {
            this.#connection.send(message)
        } catch{
            // The connection closed since it was last seen open: its loss is told apart.
        }
    }

    public listen(handler: (message: string) => void): { dispose(): void } {
        const entry = { handler }
        this.#handlers.add(entry)
        return { dispose: () => this.#handlers.delete(entry) }
    }

    /** Its connection is lost: nothing reaches it until it comes back. */
    public markLost(): void {
        if(this.#isLost) return
        this.#isLost = true
        this.#listening?.dispose()
        this.#listening = null
        this.#connection = null
        this.lost.emit()
    }

    /**
     * It came back on a new connection, which replaces the old one, lost or not: a host that did not see the
     * old one drop still has a client to tell again what it knows.
     */
    public markBack(member: string, connection: Connection): void {
        const old = this.#connection
        this.#member = member
        this.#attach(connection)
        if(old && old !== connection) old.close()
        this.#isLost = false
        this.back.emit()
    }

    /** It left for good: its connection closes, and nothing is heard of it any more. */
    public close(): void {
        this.#listening?.dispose()
        this.#listening = null
        this.#connection?.close()
        this.#connection = null
        this.#handlers.clear()
    }


    #member: string
    #isLost = false
    #connection: Connection|null = null
    #listening: { dispose(): void }|null = null
    readonly #handlers = new Set<{ handler: (message: string) => void }>()

    #attach(connection: Connection): void {
        this.#listening?.dispose()
        this.#connection = connection
        this.#listening = connection.listen(message => {
            for(const { handler } of [...this.#handlers]) handler(message)
        })
    }
}
