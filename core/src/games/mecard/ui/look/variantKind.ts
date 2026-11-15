import type { ColoredText, Semantic, Text, TextColor } from "../../../../semantic"
import { Direction } from "../../sim/base/Direction"
import type { Card } from "../../sim/card/Card"

import { colorsDistinct } from "./colorGap"

/**
 * How the choice among the variants of a card is offered, from what its keys are:
 * - `dial`: every key is a direction, a needle among them on a disc;
 * - `colors`: every key is a color, all far enough apart: a dot of each;
 * - `chips`: a few keys, all shown at once, each a chip;
 * - `stepper`: numbers, or many keys, one shown at a time between two arrows.
 */
export type VariantKind = "dial"|"colors"|"chips"|"stepper"

/** How many keys are all shown at once, as chips or dots: more are stepped through. */
export const MAX_CHIPS = 6

/** One variant of a card: what it is chosen by, and the card it is. */
export interface VariantEntry {
    readonly key: Text
    readonly card: Card
}

/**
 * The variants of a card, none for a card with nothing to choose: in the order the card lists them, except
 * numbers, which go from the least to the greatest, however the card lists them.
 */
export function variantEntries(card: Card): readonly VariantEntry[] {
    const entries = [...card.variants()].map(([key, variant]) => ({ key, card: variant }))
    return entries.every(({ key }) => typeof key === "number")
        ? entries.sort((one, other) => (one.key as number) - (other.key as number))
        : entries
}

/**
 * How close to its place a direction must be for a dial to draw it there: the cosine of its gap to it. A
 * dial spreads its steps evenly, the first straight up, so it draws only directions that are.
 */
const DIAL_TOLERANCE = 0.999

/** Are all the keys directions, spread evenly around a circle, the first straight up, clockwise? */
function spreadEvenly(keys: readonly Text[]): boolean {
    return keys.every((key, index) => {
        if(!(key instanceof Direction)) return false
        const angle = (index / keys.length) * 2 * Math.PI
        return key.vector.x * Math.sin(angle) - key.vector.y * Math.cos(angle) >= DIAL_TOLERANCE
    })
}

/** The color a key is, none for a key that is not a color or tells itself as one. */
export function keyColorOf(key: Text): TextColor|null {
    if(typeof key !== "object" || key === null || Array.isArray(key)) return null
    if("color" in key && "text" in key) return (key as ColoredText).color
    if("toSemString" in key) return keyColorOf((key as Semantic).toSemString())
    return null
}

/**
 * How to offer the choice among entries, none when there is nothing to choose: fewer than two entries.
 * The kind of the keys comes first, their number after.
 */
export function variantKindOf(entries: readonly VariantEntry[]): VariantKind|null {
    if(entries.length < 2) return null
    if(spreadEvenly(entries.map(({ key }) => key))) return "dial"
    if(entries.every(({ key }) => typeof key === "number")) return "stepper"
    if(entries.length > MAX_CHIPS) return "stepper"
    const colors = entries.map(({ key }) => keyColorOf(key))
    const colored = colors.filter((color): color is TextColor => color !== null)
    if(colored.length === entries.length && colorsDistinct(colored)) return "colors"
    return "chips"
}
