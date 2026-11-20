import type { Fault } from "../../../../../engine/net/Fault"
import type { Observable } from "../../../sim/base/Observable"
import type { SavedUnit } from "../../../sim/save/battleSave"

import { forward, signal } from "../../faults"
import type { DuelFighting, DuelWatching, HubPort } from "./HubPort"

/**
 * A player of a {@link Versus}: it says it came, gives its team when the hub asks for it, and follows the
 * duel the hub tells it to fight or watch. It reaches the hub through a {@link HubPort}, whatever the way.
 */
export class VersusPlayer {


    /** Told when the player fights a duel: what to show, and where to commit. */
    public readonly fighting: Observable<DuelFighting>

    /** Told when the player watches a duel. */
    public readonly watching: Observable<DuelWatching>

    /** Told when the duel followed is over: whether the player won, none for a draw or for a spectator. */
    public readonly duelOver: Observable<boolean|null>

    /** Told of what was dealt with: a message left out. */
    public readonly faulted = signal<Fault>()

    /** Told once, when the player is turned away. */
    public readonly ended = signal<Fault>()

    constructor(
        /** The way to the hub, which the player owns: it is let go with the player. */
        public readonly hub: HubPort,

        /** The units the player brings, asked when the hub wants them. */
        units: () => readonly SavedUnit[],
    ){
        this.fighting = hub.fighting
        this.watching = hub.watching
        this.duelOver = hub.duelOver
        this.#answering = hub.answerTeam(units)
        this.#forwarding = forward(hub, this, true)
        hub.join()
    }


    /** Stop. */
    public dispose(): void {
        this.#forwarding.dispose()
        this.#answering.dispose()
        this.hub.dispose()
    }


    readonly #answering: { dispose(): void }
    readonly #forwarding: { dispose(): void }
}
