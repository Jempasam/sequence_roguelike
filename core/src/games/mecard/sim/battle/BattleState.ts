import type { Card } from "../card/Card"
import type { CardChain } from "../card/CardChain"
import type { Carried } from "../usable/Usable"
import type { Status } from "../status/Status"

import type { Arena } from "./Arena"
import type { Team } from "./Team"
import type { StatBases, UnitSpec } from "./Unit"

/** The two piles of a deck. */
export interface DeckState {
    /** The draw pile, the next card last. */
    readonly pile: readonly Card[]

    readonly discard: readonly Card[]
}

/** What a unit holds beyond what it entered with: its cards where they are, its statuses, its stats. */
export interface UnitState {
    /**
     * What it entered with, its hearts and its belt as they are now, its decks left empty: the piles below
     * fill them.
     */
    readonly spec: UnitSpec

    readonly hand: readonly Card[]

    /** The piles of each of its decks. */
    readonly decks: readonly DeckState[]

    /** The deck it draws from next, by its place among them. */
    readonly cursor: number

    /** The cards out of its decks, each with the deck it goes back to. */
    readonly homes: readonly (readonly [Card, number])[]

    readonly statuses: readonly Status[]
    readonly bases: Readonly<StatBases>
}

/**
 * Everything a battle is at a rest, between two executions: enough to build it again, playing the same.
 *
 * @remarks
 * It is taken during a preparation or once the battle is over, never during an execution: a step being
 * played is running code, which nothing can write down. The units are in the order they entered, and the
 * rest names them by their index in it.
 */
export interface BattleState {
    readonly arena: Arena

    /** The state of the random numbers. */
    readonly rng: number

    readonly round: number
    readonly phase: "draw"|"preparation"|"over"
    readonly winner: Team|null
    readonly units: readonly UnitState[]

    /** The order of play of the round, as indices of units. */
    readonly initiative: readonly number[]

    /** The chain each unit committed this round, by the index of the unit. */
    readonly plans: ReadonlyMap<number, CardChain>

    /** The cards that left the hand of each unit for its chain, by the index of the unit. */
    readonly played: ReadonlyMap<number, readonly Card[]>

    /** Who summoned each summoned body, by the index of the body, then of its owner. */
    readonly owners: ReadonlyMap<number, number>

    /** What each unit chose to use at the start of the execution, by the index of the unit. */
    readonly activated: ReadonlyMap<number, readonly Carried[]>
}
