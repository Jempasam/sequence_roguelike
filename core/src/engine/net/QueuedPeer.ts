import type { SyncPeer } from "../../platform"
import { Fault } from "./Fault"
import { OutboxFullFault } from "./NetFaults"
import { Outbox } from "./Outbox"
import type { SessionPeer } from "./SessionPeer"
import type { Removable } from "../../lifetime"

/**
 * A client of the main client as the game sees it: the {@link SessionPeer} it is, with what is said to it
 * while its connection is lost kept, and given in order once it is back.
 *
 * @remarks
 * The session drops what it cannot send, for it does not know what the messages are for. Whoever tells it
 * it came back is to give it what it missed, and that is {@link QueuedPeer.flush}, called before the game is
 * told so.
 */
export class QueuedPeer implements SyncPeer {


    constructor(
        private readonly peer: SessionPeer,

        /** Told when what was kept overflowed: the oldest messages are lost. */
        private readonly overflowed: (fault: Fault) => void,
        limit?: number,
    ){
        this.#outbox = new Outbox(limit)
    }


    public get id(): string { return this.peer.id }

    public send(message: string): void {
        if(!this.peer.isLost){
            this.peer.send(message)
            return
        }
        if(this.#outbox.hold(message)) this.overflowed(new OutboxFullFault(this.id))
    }

    public listen(handler: (message: string) => void): Removable {
        return this.peer.listen(handler)
    }

    /** Give what was kept while the connection was lost, in order. */
    public flush(): void {
        this.#outbox.drain(message => this.peer.send(message))
    }

    /** Forget what was kept: the client is not coming back. */
    public forget(): void {
        this.#outbox.clear()
    }


    readonly #outbox: Outbox
}
