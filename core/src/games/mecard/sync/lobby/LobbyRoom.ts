import type { SyncPeer, SyncRoom } from "../../../../platform"

/** What hears the clients that connect or are lost: the handler, and the clients it was told of already. */
interface Hearing {
    readonly handler: (peer: SyncPeer) => void
    readonly told: Set<string>
}

/**
 * The clients of a lobby as a game played in it sees them: a {@link SyncRoom} that also tells of the clients
 * that are there already, which a room that tells only of those that connect cannot.
 *
 * @remarks
 * A game starts once its clients are connected, and what takes them in ({@link Gathering}, {@link Relay},
 * {@link SeatDealer}) listens for the clients that connect. Given the room of the network, it would never
 * hear of the ones in the lobby. Here a handler for the clients connecting is told of each client present
 * too, just after it is added, so the code that adds it finishes its constructor first. A client is told to
 * a handler once, whether it connected before or in between.
 *
 * A handler for the clients lost is told of those lost at that moment, the same way.
 */
export class LobbyRoom implements SyncRoom {


    constructor(room: SyncRoom){
        this.#handles = [
            room.onJoin(peer => this.#join(peer)),
            room.onLost(peer => this.#lose(peer)),
            room.onBack(peer => this.#return(peer)),
            room.onLeave(peer => this.#leave(peer)),
        ]
    }


    /** The clients connected, lost ones included, in the order they connected. */
    public get peers(): readonly SyncPeer[] {
        return [...this.#present.values()]
    }

    /** The clients connected and not lost, in the order they connected. */
    public get reachable(): readonly SyncPeer[] {
        return this.peers.filter(peer => !this.#lost.has(peer.id))
    }

    public onJoin(handler: (peer: SyncPeer) => void): { dispose(): void } {
        const entry: Hearing = { handler, told: new Set() }
        this.#joining.add(entry)
        queueMicrotask(() => {
            for(const peer of this.peers) if(this.#joining.has(entry)) this.#tell(entry, peer)
        })
        return { dispose: () => this.#joining.delete(entry) }
    }

    public onLost(handler: (peer: SyncPeer) => void): { dispose(): void } {
        const entry: Hearing = { handler, told: new Set() }
        this.#losing.add(entry)
        queueMicrotask(() => {
            for(const peer of this.peers) if(this.#lost.has(peer.id) && this.#losing.has(entry)) this.#tell(entry, peer)
        })
        return { dispose: () => this.#losing.delete(entry) }
    }

    public onBack(handler: (peer: SyncPeer) => void): { dispose(): void } {
        this.#returning.add(handler)
        return { dispose: () => this.#returning.delete(handler) }
    }

    public onLeave(handler: (peer: SyncPeer) => void): { dispose(): void } {
        this.#leaving.add(handler)
        return { dispose: () => this.#leaving.delete(handler) }
    }

    /** Stop following the room of the network: nothing is told any more. */
    public dispose(): void {
        for(const handle of this.#handles) handle.dispose()
        this.#joining.clear()
        this.#losing.clear()
        this.#returning.clear()
        this.#leaving.clear()
    }


    readonly #handles: readonly { dispose(): void }[]
    readonly #present = new Map<string, SyncPeer>()
    readonly #lost = new Set<string>()
    readonly #joining = new Set<Hearing>()
    readonly #losing = new Set<Hearing>()
    readonly #returning = new Set<(peer: SyncPeer) => void>()
    readonly #leaving = new Set<(peer: SyncPeer) => void>()

    #tell(entry: Hearing, peer: SyncPeer): void {
        if(entry.told.has(peer.id)) return
        entry.told.add(peer.id)
        entry.handler(peer)
    }

    #join(peer: SyncPeer): void {
        this.#present.set(peer.id, peer)
        for(const entry of [...this.#joining]) this.#tell(entry, peer)
    }

    #lose(peer: SyncPeer): void {
        this.#lost.add(peer.id)
        for(const entry of [...this.#losing]) this.#tell(entry, peer)
    }

    #return(peer: SyncPeer): void {
        this.#lost.delete(peer.id)
        for(const entry of this.#losing) entry.told.delete(peer.id)
        for(const handler of [...this.#returning]) handler(peer)
    }

    #leave(peer: SyncPeer): void {
        this.#present.delete(peer.id)
        this.#lost.delete(peer.id)
        for(const entry of this.#joining) entry.told.delete(peer.id)
        for(const entry of this.#losing) entry.told.delete(peer.id)
        for(const handler of [...this.#leaving]) handler(peer)
    }
}
