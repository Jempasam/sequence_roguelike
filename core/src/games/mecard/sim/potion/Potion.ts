import type { Text } from "../../../../semantic"
import type { Rgba } from "../base/Rgba"
import type { Battle } from "../battle/Battle"
import type { Unit } from "../battle/Unit"

/**
 * A potion: what it does to a unit at a level, a number of rounds for most. A level below zero is the
 * potion turned around by an antidote: it takes that many rounds off, or what it would give.
 */
export interface Potion {
    /** What it is called: `poison`. */
    readonly name: string

    /** The color it shows in: its puddles, its splashes. */
    readonly color: Rgba

    /** What it does at a level, for the player. */
    readonly description: Text

    /** Pour it on a unit at a level, below zero for it turned around. */
    apply(battle: Battle, target: Unit, level: number): void

    /** Its name. */
    toString(): string

    /** Its name in its color. */
    toSemString(): Text
}

/**
 * A potion as it flows from card to card: the potion, turned around or not, and how strong. The card using
 * it says at what level, from the alchemy of its unit.
 */
export interface Dose {
    readonly potion: Potion

    /** Is it turned around, by an antidote: -1, or as it is: 1? */
    readonly sign: 1|-1

    /** How many times stronger than its level, distilled. */
    readonly factor: number
}

/** What tells two doses apart: the same text, the same dose. */
export function doseKey(dose: Dose): string {
    return JSON.stringify([dose.potion.name, dose.sign, dose.factor])
}

/** The level a potion action of the catalog gives its potion, before the alchemy of its unit. */
export const POTION_LEVEL = 2

/**
 * The level a unit pours a dose at: the base of the action and the alchemy of the unit, times what the
 * action and the dose say, turned around for an antidote.
 */
export function levelOf(dose: Dose, unit: Unit, times = 1): number {
    return dose.sign * (POTION_LEVEL + unit.stats.alchemy.value) * dose.factor * times
}

/** Pour a dose on a unit at a level. */
export function pour(battle: Battle, dose: Dose, target: Unit, level: number): void {
    if(level !== 0) dose.potion.apply(battle, target, level)
}
