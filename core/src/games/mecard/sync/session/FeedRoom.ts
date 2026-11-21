import type { SyncPeer, SyncRoom } from "../../../../platform"
import type { Removable } from "../../../../lifetime"

/**
 * A room that tells only what it is told to: whoever builds it says who joins, is lost, comes back and leaves,
 * and what listens hears it. It is what a {@link LobbyRoom} follows for the players of a game alone.
 */
export class FeedRoom implements SyncRoom {


    public onJoin(handler: (peer: SyncPeer) => void): Removable {
        return this.#add(this.#joins, handler)
    }

    public onLost(handler: (peer: SyncPeer) => void): Removable {
        return this.#add(this.#losses, handler)
    }

    public onBack(handler: (peer: SyncPeer) => void): Removable {
        return this.#add(this.#backs, handler)
    }

    public onLeave(handler: (peer: SyncPeer) => void): Removable {
        return this.#add(this.#leaves, handler)
    }

    public join(peer: SyncPeer): void { this.#tell(this.#joins, peer) }
    public lose(peer: SyncPeer): void { this.#tell(this.#losses, peer) }
    public back(peer: SyncPeer): void { this.#tell(this.#backs, peer) }
    public leave(peer: SyncPeer): void { this.#tell(this.#leaves, peer) }

    /** Stop telling. */
    public dispose(): void {
        for(const handlers of [this.#joins, this.#losses, this.#backs, this.#leaves]) handlers.clear()
    }


    readonly #joins = new Set<(peer: SyncPeer) => void>()
    readonly #losses = new Set<(peer: SyncPeer) => void>()
    readonly #backs = new Set<(peer: SyncPeer) => void>()
    readonly #leaves = new Set<(peer: SyncPeer) => void>()

    #add(handlers: Set<(peer: SyncPeer) => void>, handler: (peer: SyncPeer) => void): Removable {
        handlers.add(handler)
        return { remove: () => handlers.delete(handler) }
    }

    #tell(handlers: Set<(peer: SyncPeer) => void>, peer: SyncPeer): void {
        for(const handler of [...handlers]) handler(peer)
    }
}
