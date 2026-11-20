import type { Fault } from "../../../../../engine/net/Fault"
import type { Observable } from "../../../sim/base/Observable"
import type { Battle } from "../../../sim/battle/Battle"
import type { SavedUnit } from "../../../sim/save/battleSave"

import type { Progress } from "../../progress/ProgressMessage"

/** The lives of the players as a player reads them: from the hub's book, or from what the hub told. */
export interface LivesView {
    /** The lives a player has left, none for one not heard of. */
    livesOf(id: string): number|null

    /** The players still in. */
    alive(): readonly string[]

    /** Told of each player whose lives changed, with the lives it has left. */
    readonly livesChanged: Observable<{ readonly id: string, readonly lives: number }>

    /** Told of each player that is out. */
    readonly eliminated: Observable<string>
}

/** The time limit of the round of the duels as a player reads it. */
export interface DeadlineView {
    /** How long is left, in milliseconds, none when nothing runs. */
    remaining(): number|null

    /** Told, with how long it runs, each time it starts. */
    readonly started: Observable<number>

    /** Told once the time is over. */
    readonly expired: Observable<void>
}

/** Where the others stand, as a player reads it. */
export interface ProgressView {
    /** Where a player stands, as last known, none for one not known. */
    progressOf(id: string): Progress|null

    /** Told of each progress, with the id of the player. */
    readonly progressed: Observable<{ readonly id: string, readonly progress: Progress }>
}

/** The duel a player fights or watches, as the player gets it to show and to play. */
export interface DuelAccess {
    /** What is shown, and where the player commits its plans. */
    readonly battle: Battle

    /** The units of the player in the duel, by their names there: none for a spectator. */
    readonly units: readonly string[]

    /** Say that what was committed for the units of the player is its plan: it is ready. */
    submit(): void
}

/** What a player gets when it fights a duel: the duel, and who is in each camp. */
export type DuelFighting = DuelAccess & {
    readonly allies: readonly string[]
    readonly opponents: readonly string[]
}

/** What a player gets when it watches a duel: the duel, and who is in each camp. */
export type DuelWatching = DuelAccess & { readonly sides: readonly (readonly string[])[] }

/**
 * What a player needs of the hub, whatever way it reaches it: a connection to a hub far away, or the hub it
 * plays on itself. The player never knows which, and the same code plays on both.
 *
 * @remarks
 * Each event the hub tells a player is an observable of its own. What only a race tells, the orders and the
 * lives, is never told in a mode that has none. Nothing here throws or rejects.
 */
export interface HubPort {
    /** Say that the player came to play. */
    join(): void

    /** Say whether the player is ready, in the lobby. */
    setReady(isReady: boolean): void

    /**
     * Give the hub the team of the player, when it asks for it.
     *
     * @returns What stops answering.
     */
    answerTeam(units: () => readonly SavedUnit[]): { dispose(): void }

    /** Tell the hub where the journey of the player stands. */
    sendProgress(progress: Progress): void

    /** Told when the hub sends the player to the halt of the duels. */
    readonly kicked: Observable<void>

    /** Told when the hub lets the player go on with its journey. */
    readonly resumed: Observable<void>

    /** Told when the hub asks where the player stands again, as its connection came back. */
    readonly asked: Observable<void>

    /** Told, with the winner, when the race is won. */
    readonly raceWon: Observable<string>

    /** Told when the race is over and nobody won. */
    readonly raceFinished: Observable<void>

    /** Told when the player fights a duel, with the players of its camp and of the other. */
    readonly fighting: Observable<DuelFighting>

    /** Told when the player watches a duel, with the players of each camp. */
    readonly watching: Observable<DuelWatching>

    /** Told when the duel followed is over: whether the player won, none for a draw or for a spectator. */
    readonly duelOver: Observable<boolean|null>

    /** The lives of the players. */
    readonly lives: LivesView

    /** The time limit of the round of the duels. */
    readonly deadline: DeadlineView

    /** Where the others stand. */
    readonly others: ProgressView

    /** Told of what was dealt with: a message left out, a row skipped. */
    readonly faulted: Observable<Fault>

    /** Told once, when the player is turned away from the game. */
    readonly ended: Observable<Fault>

    /** Stop. */
    dispose(): void
}
