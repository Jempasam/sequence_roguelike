/** How a battle ended, for the side measured. */
export type Outcome = "win"|"loss"|"draw"|"timeout"

/** What a number of battles gave. */
export interface Tally {
    wins: number
    losses: number
    draws: number

    /** Battles still going at the round limit, or blocked: counted apart, out of the winrate. */
    timeouts: number

    /** Rounds played, all battles together. */
    rounds: number

    /** Effects that failed in these battles. */
    errors: number

    /** Wins that are timeouts the soft win gave to the allies, already counted in the wins. */
    softWins: number

    /** Losses that are timeouts the soft win gave to the foes, already counted in the losses. */
    softLosses: number
}

export function emptyTally(): Tally {
    return { wins: 0, losses: 0, draws: 0, timeouts: 0, rounds: 0, errors: 0, softWins: 0, softLosses: 0 }
}

/**
 * Count a battle in a tally.
 *
 * @param soft - Was it a timeout that the soft win gave to a side?
 */
export function addBattle(
    tally: Tally, outcome: Outcome, rounds: number, errors: number, soft = false,
): void {
    if(outcome === "win") tally.wins++
    else if(outcome === "loss") tally.losses++
    else if(outcome === "draw") tally.draws++
    else tally.timeouts++
    tally.rounds += rounds
    tally.errors += errors
    if(soft && outcome === "win") tally.softWins++
    if(soft && outcome === "loss") tally.softLosses++
}

/** The sum of tallies. */
export function mergeTallies(tallies: readonly Tally[]): Tally {
    const sum = emptyTally()
    for(const tally of tallies){
        sum.wins += tally.wins
        sum.losses += tally.losses
        sum.draws += tally.draws
        sum.timeouts += tally.timeouts
        sum.rounds += tally.rounds
        sum.errors += tally.errors
        sum.softWins += tally.softWins
        sum.softLosses += tally.softLosses
    }
    return sum
}

/** How many battles count for the winrate: those that ended. */
export function decided(tally: Tally): number {
    return tally.wins + tally.losses + tally.draws
}

/** How many battles were played. */
export function played(tally: Tally): number {
    return decided(tally) + tally.timeouts
}

/** The share of battles won among those that ended, none when none ended. */
export function winrate(tally: Tally): number|null {
    const total = decided(tally)
    return total === 0 ? null : tally.wins / total
}

/** The z of a 95 % interval. */
const Z = 1.96

/**
 * The half-width of the Wilson interval of a winrate at 95 %, none when no battle ended. It stays within
 * [0, 1] and is not zero when every battle was won, which a plain margin would be.
 */
export function margin(tally: Tally): number|null {
    const total = decided(tally)
    if(total === 0) return null
    const p = tally.wins / total
    const denominator = 1 + Z * Z / total
    return Z * Math.sqrt(p * (1 - p) / total + Z * Z / (4 * total * total)) / denominator
}

/** The rounds a battle took on average, none when none was played. */
export function meanRounds(tally: Tally): number|null {
    const total = played(tally)
    return total === 0 ? null : tally.rounds / total
}
