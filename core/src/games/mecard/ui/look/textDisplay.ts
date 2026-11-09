import { KeywordWord } from "../../../../semantic"
import type { Semantic, SvgPath, Text, TextColor } from "../../../../semantic"
import { DISTANCE, HEART } from "../../sim/base/keywords"
import { DamageType } from "../../sim/battle/DamageType"

import { explanationOf } from "./explanations"

/** The color a keyword stands out in, readable on the panels as on the white of a bubble. */
const KEYWORD_TEXT: TextColor = [1, 0.7, 0.15]

/** The left half of a heart in a square of 16: the unit damage and life are counted in. */
const HALF_HEART_PATH = "M8 15 L1.6 8.6 A4.4 4.4 0 0 1 8 3.4 Z"

/** A half heart as tall as a line, which a plain string writes as a word. */
function halfHeart(word: string): SvgPath {
    return { svg: HALF_HEART_PATH, size: 16, alt: word }
}

/** The color each type of damage is drawn in. */
const DAMAGE_COLORS: ReadonlyMap<DamageType, TextColor> = new Map<DamageType, TextColor>([
    [DamageType.PHYSICAL, [1, 0.95, 0.85]],
    [DamageType.ELEMENTAL, [1, 0.6, 0.25]],
])

/** The color a distance is drawn in: the one of the reach in the previews. */
const DISTANCE_TEXT: TextColor = [0.55, 0.85, 1]

/**
 * How the interface reads the texts of the simulation, which only say what they mean: a heart is drawn, a
 * keyword stands out, and what has an explanation links to itself. Anything else tells itself.
 */
export function mecardDisplay(value: object): Text|undefined {
    if(value instanceof DamageType){
        const heart = { color: DAMAGE_COLORS.get(value) ?? KEYWORD_TEXT, text: halfHeart(value.label) }
        return { link: value, text: heart }
    }
    if(value instanceof KeywordWord){
        if(value.keyword === HEART) return halfHeart(value.form)
        if(value.keyword === DISTANCE){
            return { link: value.keyword, text: { color: DISTANCE_TEXT, text: value.form } }
        }
        if(explanationOf(value.keyword) === undefined) return undefined
        return { link: value.keyword, text: { color: KEYWORD_TEXT, text: value.form } }
    }
    if(explanationOf(value) === undefined) return undefined
    return { link: value, text: (value as Semantic).toSemString() }
}
