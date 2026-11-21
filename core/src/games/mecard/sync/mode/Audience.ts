import type { SyncPeer, SyncSender } from "../SyncChannel"
import type { Removable } from "../../../../lifetime"

/**
 * The public of one instance: the clients that follow it or control it. A {@link SyncSender} over a set of
 * clients
 * that changes, given to the broadcasters in place of the sender of the whole lobby.
 *
 * @remarks
 * It gives no right: what a client may do on the instance is the manager's. A client added hears, at once
 * and in the
 * order they were asked for, the first messages of the broadcasters, as one connecting does. A client whose
 * connection is lost is not told, and is greeted again when it comes back.
 */
export class Audience implements SyncSender {


    /** Who hears the instance now. */
    public get peers(): readonly SyncPeer[] {
        return [...this.#peers.values()]
    }

    /** Is a client of the audience? */
    public has(id: string): boolean {
        return this.#peers.has(id)
    }

    /** Have a client hear the instance from now on, and greet it with the state as it stands. */
    public add(peer: SyncPeer): void {
        this.#peers.set(peer.id, peer)
        this.greet(peer)
    }

    /** Stop telling a client. */
    public remove(id: string): void {
        this.#peers.delete(id)
    }

    /** Give a client the first messages again, as they stand. */
    public greet(peer: SyncPeer): void {
        for(const { initial } of [...this.#entries]){
            const message = initial()
            if(message !== null) peer.send(message)
        }
    }

    public send(message: string): void {
        for(const peer of [...this.#peers.values()]) peer.send(message)
    }

    public onPeer(initial: () => string|null): Removable {
        const entry = { initial }
        this.#entries.add(entry)
        return { remove: () => this.#entries.delete(entry) }
    }

    /** Stop telling everyone. */
    public dispose(): void {
        this.#peers.clear()
        this.#entries.clear()
    }


    readonly #peers = new Map<string, SyncPeer>()
    readonly #entries = new Set<{ initial: () => string|null }>()
}
