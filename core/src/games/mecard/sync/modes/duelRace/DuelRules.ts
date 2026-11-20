import type { Rng } from "../../../sim/base/Rng"

import type { Matching, TeamSize } from "../Matching"
import { randomTeams, shrinking } from "../Matching"
import { LOSERS_LOSE_ONE } from "./DuelOutcome"
import type { DuelOutcome } from "./DuelOutcome"

/** What a race of duels is played by: all the rules of the mode, given to it as one object. */
export interface DuelRules {
    /** How many lives each player starts with. */
    readonly lives: number

    /** How long the others have once the first player arrived at the duels, in milliseconds. */
    readonly arrivalMs: number

    /** One row of halts of the duels every this many rows of the map. */
    readonly duelEvery: number

    /** Is a row of them laid past the last row of the map too? No by default. */
    readonly closing?: boolean

    /** How many players a camp holds. */
    readonly teamSize: TeamSize

    /** How the players that arrived are made into duels. */
    readonly matching: Matching

    /** What a duel costs the players. */
    readonly outcome: DuelOutcome

    /** How long a player has to give its team for a duel, in milliseconds. */
    readonly teamTimeoutMs: number
}

/**
 * The rules of a race of duels: six lives, ninety seconds, camps of two at most, the losers of a duel
 * losing a life. Anything given replaces what it stands for.
 *
 * @param rng - What the matching draws from, its own, when none is given.
 */
export function duelRules(rng: Rng, changes: Partial<DuelRules> = {}): DuelRules {
    const teamSize = changes.teamSize ?? shrinking(2)
    return {
        lives: 6,
        arrivalMs: 90_000,
        duelEvery: 4,
        teamSize,
        matching: randomTeams(rng, teamSize),
        outcome: LOSERS_LOSE_ONE,
        teamTimeoutMs: 10_000,
        ...changes,
    }
}
