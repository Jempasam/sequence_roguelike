import type { SyncPeer, SyncSender } from "../SyncChannel"

import type { LobbyRoom } from "./LobbyRoom"
import type { Removable } from "../../../../lifetime"

/**
 * Where a game played in a lobby sends what it tells its clients: the sender of the network, that also
 * greets the clients already there.
 *
 * @remarks
 * A sender gives its first messages to each client that connects, and those in the lobby connected before the
 * game was there to give them. {@link LobbySender.greetAll} gives them at once, in the order they were asked
 * for, as a client connecting is given them. Clients that connect afterwards are greeted by the network, for
 * what is asked here is asked of it too.
 */
export class LobbySender implements SyncSender {


    constructor(
        private readonly sender: SyncSender,

        /** The clients of the lobby, which are greeted. */
        private readonly room: LobbyRoom,
    ){}


    public send(message: string): void {
        this.sender.send(message)
    }

    public onPeer(initial: () => string|null): Removable {
        const entry = { initial, handle: this.sender.onPeer(initial) }
        this.#peers.add(entry)
        return {
            remove: () => {
                this.#peers.delete(entry)
                entry.handle.remove()
            },
        }
    }

    /** Give each client that is reachable now the first messages, as they stand. */
    public greetAll(): void {
        for(const peer of this.room.reachable) this.greet(peer)
    }

    /**
     * Give one client the first messages, as they stand: one that joins the game while it is played is no client
     * connecting, so the network does not greet it.
     */
    public greet(peer: SyncPeer): void {
        for(const { initial } of [...this.#peers]){
            const message = initial()
            if(message !== null) peer.send(message)
        }
    }

    /** Stop asking the network to give the first messages. */
    public dispose(): void {
        for(const { handle } of [...this.#peers]) handle.remove()
        this.#peers.clear()
    }


    readonly #peers = new Set<{ initial: () => string|null, handle: Removable }>()
}
