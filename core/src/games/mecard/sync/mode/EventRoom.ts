import type { SyncPeer, SyncRoom } from "../SyncChannel"

/** A peer that is only a name: what a brick that follows a room reads of the people it is told of. */
function named(id: string): SyncPeer {
    return { id, send: () => {}, listen: () => ({ dispose: () => {} }) }
}

/**
 * A {@link SyncRoom} the manager of a game tells by hand, for the bricks that follow a room of players
 * ({@link DuelRound}) when the people of the game are the mode's to tell: who is lost, back, or gone.
 *
 * @remarks
 * It never tells of someone connecting: the mode knows its players, and the bricks it gives this room to
 * are asked
 * only of what happens to them.
 */
export class EventRoom implements SyncRoom {


    public onJoin(): { dispose(): void } {
        return { dispose: () => {} }
    }

    public onLost(handler: (peer: SyncPeer) => void): { dispose(): void } {
        this.#lost.add(handler)
        return { dispose: () => this.#lost.delete(handler) }
    }

    public onBack(handler: (peer: SyncPeer) => void): { dispose(): void } {
        this.#back.add(handler)
        return { dispose: () => this.#back.delete(handler) }
    }

    public onLeave(handler: (peer: SyncPeer) => void): { dispose(): void } {
        this.#left.add(handler)
        return { dispose: () => this.#left.delete(handler) }
    }

    /** Tell that a player lost its connection. */
    public lose(id: string): void {
        for(const handler of [...this.#lost]) handler(named(id))
    }

    /** Tell that a player is back. */
    public return(id: string): void {
        for(const handler of [...this.#back]) handler(named(id))
    }

    /** Tell that a player left the game. */
    public leave(id: string): void {
        for(const handler of [...this.#left]) handler(named(id))
    }


    readonly #lost = new Set<(peer: SyncPeer) => void>()
    readonly #back = new Set<(peer: SyncPeer) => void>()
    readonly #left = new Set<(peer: SyncPeer) => void>()
}
