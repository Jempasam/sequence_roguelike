import type { Gathering, Member } from "../../Gathering"
import type { TeamRequest } from "../../TeamRequest"
import type { DuelPlayer } from "./DuelPlayer"
import { RemotePlayer } from "./RemotePlayer"

/**
 * The players a hub has, by their ids: a client that came is a {@link RemotePlayer}, reached on its peer, and
 * a player that plays on the hub itself is added by whoever makes it. The hub reads them all alike, as
 * {@link DuelPlayer}s.
 *
 * @remarks
 * A member that left for good is no player any more. A member with no peer is the hub's own, which is added
 * with {@link Players.add}.
 */
export class Players {


    constructor(
        gathering: Gathering,

        /** What asks a client for its team. */
        private readonly request: TeamRequest,
    ){
        this.#observers = [
            gathering.memberJoined.add(member => this.#joined(member)),
            gathering.memberLeft.add(member => this.#players.delete(member.id)),
        ]
    }


    /** The player of an id, none when there is none. */
    public playerOf(id: string): DuelPlayer|null {
        return this.#players.get(id) ?? null
    }

    /** Take in a player that plays on the hub itself. */
    public add(player: DuelPlayer): void {
        this.#players.set(player.id, player)
    }

    /** Stop following the gathering. */
    public dispose(): void {
        for(const observer of this.#observers) observer.remove()
    }


    readonly #observers: readonly { remove(): void }[]
    readonly #players = new Map<string, DuelPlayer>()

    #joined({ id, peer }: Member): void {
        if(peer) this.#players.set(id, new RemotePlayer(peer, this.request))
    }
}
