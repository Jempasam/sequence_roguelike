import { KeywordWord } from "../../../../semantic"
import type { Picture, Semantic, Shown, TextColor } from "../../../../semantic"
import { DISTANCE, GOLD, HEART } from "../../sim/base/keywords"
import { DamageType } from "../../sim/battle/DamageType"
import { AbstractProcess } from "../../sim/process/AbstractProcess"
import { StatusType } from "../../sim/status/Status"

import { explanationOf, isFightCategory, isFloorType, isHaltType, isKit, isUpgrade } from "./explanations"

/** The color a keyword stands out in, readable on the panels as on the white of a bubble. */
const KEYWORD_TEXT: TextColor = [1, 0.7, 0.15]

/** The icon of a heart, the unit damage and life are counted in, drawn in the color of the text around it. */
const HEART_ICON = "tiny_icon/heart"

/** The icon of a damage, drawn in the color of its type. */
const DAMAGE_ICON = "tiny_icon/damage"

/** The icon of gold, drawn as it is. */
const GOLD_ICON = "tiny_icon/gold"

/** A picture as tall as a line, which a plain string writes as a word, or as nothing for an empty one. */
function icon(key: string, word: string): Picture {
    return { picture: key, alt: word }
}

/** The color each type of damage is drawn in. */
const DAMAGE_COLORS: ReadonlyMap<DamageType, TextColor> = new Map<DamageType, TextColor>([
    [DamageType.PHYSICAL, [1, 0.95, 0.85]],
    [DamageType.ELEMENTAL, [1, 0.6, 0.25]],
])

/** The color a distance is drawn in: the one of the reach in the previews. */
const DISTANCE_TEXT: TextColor = [0.55, 0.85, 1]

/** The color the name of each sort of place, of a kit and of an upgrade is written in. */
const HALT_TEXT: TextColor = [0.9, 0.78, 0.45]
const FIGHT_CATEGORY_TEXT: TextColor = [0.95, 0.5, 0.4]
const FLOOR_TEXT: TextColor = [0.6, 0.82, 0.55]
const KIT_TEXT: TextColor = [0.35, 0.6, 1]
const UPGRADE_TEXT: TextColor = [0.8, 0.55, 1]

/** The name of what is told by no `toSemString` but a name, in its color: none for any other object. */
function namedBy(value: object): Shown|undefined {
    const name = (color: TextColor) => ({ color, text: (value as { name: string }).name })
    if(isFloorType(value)) return name(FLOOR_TEXT)
    if(isHaltType(value)) return name(HALT_TEXT)
    if(isFightCategory(value)) return name(FIGHT_CATEGORY_TEXT)
    if(isKit(value)) return name(KIT_TEXT)
    if(isUpgrade(value)) return name(UPGRADE_TEXT)
    return undefined
}

/**
 * How the interface reads the texts of the simulation, which only say what they mean: a heart, a damage and
 * gold are drawn, a keyword stands out, and what has an explanation links to itself. Anything else tells
 * itself.
 */
export function mecardDisplay(value: object): Shown|undefined {
    if(value instanceof DamageType){
        const color = DAMAGE_COLORS.get(value) ?? KEYWORD_TEXT
        return { link: value, text: { color, text: icon(DAMAGE_ICON, value.label) } }
    }
    if(value instanceof KeywordWord){
        if(value.keyword === HEART) return icon(HEART_ICON, value.form)
        if(value.keyword === GOLD) return { link: value.keyword, text: icon(GOLD_ICON, value.form) }
        if(value.keyword === DISTANCE){
            return { link: value.keyword, text: { color: DISTANCE_TEXT, text: value.form } }
        }
        if(explanationOf(value.keyword) === undefined) return undefined
        return { link: value.keyword, text: { color: KEYWORD_TEXT, text: value.form } }
    }
    if(explanationOf(value) === undefined) return undefined
    const named = namedBy(value)
    if(named) return { link: value, text: named }
    if(value instanceof StatusType) return { link: value, text: [icon(value.visual.visual, ""), value.toSemString()] }
    if(value instanceof AbstractProcess) return { link: value, text: [icon(value.icon.visual, ""), value.toSemString()] }
    return { link: value, text: (value as Semantic).toSemString() }
}
