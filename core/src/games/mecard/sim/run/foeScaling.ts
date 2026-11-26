import { MAX_CHAIN_CARDS } from "../battle/Unit"
import type { Item } from "../item/Item"
import { POWER } from "../item/subs/stat/Power"

/** How many levels of floor it takes the foes to double the cards they play. */
export const DOUBLING_LEVELS = 4

/** How many levels of floor it takes the foes to gather one more copy of the power. */
export const POWER_LEVELS = 2

/** The copies of the power a foe carries on a floor of a level, none on the first. */
export function powerOf(level: number): Item[] {
    return Array<Item>(Math.floor((level - 1) / POWER_LEVELS)).fill(POWER)
}

/**
 * How many times more cards a foe whose deck is kept in order plays on a floor of a level: doubled every
 * {@link DOUBLING_LEVELS} levels, in steps, so it always plays whole rounds of its loop. It stops doubling
 * before its chain would hold more than {@link MAX_CHAIN_CARDS} cards.
 *
 * @param draw - How many cards it draws on the first floor.
 */
export function orderedFactor(level: number, draw: number): number {
    let factor = 2 ** Math.floor((level - 1) / DOUBLING_LEVELS)
    while(factor > 1 && draw * factor > MAX_CHAIN_CARDS) factor /= 2
    return factor
}

/**
 * How many times more cards a foe whose deck is shuffled plays on a floor of a level: the same as one kept
 * in order every {@link DOUBLING_LEVELS} levels, in a straight line between two such. Its chain never holds
 * more than {@link MAX_CHAIN_CARDS} cards for it.
 *
 * @param chainSize - How many cards its chain holds on the first floor.
 */
export function unorderedFactor(level: number, chainSize: number): number {
    const past = level - 1
    const step = 2 ** Math.floor(past / DOUBLING_LEVELS)
    const factor = step * (1 + (past % DOUBLING_LEVELS) / DOUBLING_LEVELS)
    return Math.max(1, Math.min(factor, MAX_CHAIN_CARDS / chainSize))
}
