import type { Fault } from "../../../../../engine/net/Fault"
import type { Battle } from "../../../sim/battle/Battle"
import type { SavedUnit } from "../../../sim/save/battleSave"

import type { BattleHost } from "../../battle/BattleHost"
import type { DuelWatchMessage } from "../DuelMessage"

/** What a player is told of the duel it fights: which it is, and who is in each camp. */
export interface DuelFought {
    /** Its number in the round, which the topics of its battle go by. */
    readonly number: number

    /** The players of its camp, itself among them, by their ids. */
    readonly allies: readonly string[]

    /** The players of the other camp, by their ids. */
    readonly opponents: readonly string[]
}

/** What a spectator is told of the duel it watches. */
export type DuelWatched = DuelWatchMessage

/**
 * What the hub needs of a player, whatever way it reaches it: a client far away, or a player that plays on
 * the hub itself. The hub never knows which, and every player is the same to it.
 *
 * @remarks
 * Nothing here throws or rejects: what goes wrong is a {@link Fault} returned, or told by the observables of
 * the hub.
 */
export interface DuelPlayer {
    /** What tells the player from the others. */
    readonly id: string

    /** The team the player brings, checked: what the simulation cannot load is a fault. It never rejects. */
    team(): Promise<readonly SavedUnit[]|Fault>

    /**
     * The player fights a duel with these units: it plays them on the battle the hub has, and gives its plans
     * through the host.
     *
     * @returns What stops the hub from hearing the plans of the player.
     */
    fight(
        duel: DuelFought,
        battle: Battle,
        host: BattleHost,
        units: readonly string[],
    ): { dispose(): void }

    /** The player watches a duel, as a spectator. */
    watch(duel: DuelWatched, battle: Battle): void

    /** The player is sent to the halt of the duels. */
    kick(): void

    /** The player goes on with its journey. */
    resume(): void

    /** The connection of the player came back: what it was told of its duel is told again. */
    back(): void

    /** The connection of the player came back: it is told what it may have missed, and asked where it stands. */
    refresh(): void

    /** The race is over: who won it, none when nobody did. */
    end(winner: string|null): void
}
