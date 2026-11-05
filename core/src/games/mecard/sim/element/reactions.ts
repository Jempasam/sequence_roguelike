import { rgba } from "../base/Rgba"

import type { Element } from "./Element"
import { Compound } from "./subs/Compound"
import { FIRE_ELEMENT } from "./subs/Fire"
import { LIGHTNING_ELEMENT } from "./subs/Lightning"
import { PLANT_ELEMENT } from "./subs/Plant"
import { STONE_ELEMENT } from "./subs/Stone"
import { WATER_ELEMENT } from "./subs/Water"
import { WIND_ELEMENT } from "./subs/Wind"

export const STEAM = new Compound("Vapeur", rgba(0.85, 0.9, 0.95), "ébouillanté", FIRE_ELEMENT, WATER_ELEMENT)
export const LAVA = new Compound("Lave", rgba(1, 0.35, 0.1), "calciné", FIRE_ELEMENT, STONE_ELEMENT)
export const STORM = new Compound("Tempête", rgba(0.75, 0.8, 1), "foudroyé", WIND_ELEMENT, LIGHTNING_ELEMENT)
export const MUD = new Compound("Boue", rgba(0.5, 0.4, 0.3), "embourbé", WATER_ELEMENT, STONE_ELEMENT)
export const BLAZE_ELEMENT = new Compound("Brasier", rgba(1, 0.7, 0.2), "embrasé", FIRE_ELEMENT, WIND_ELEMENT)
export const BRAMBLES = new Compound("Ronces", rgba(0.35, 0.6, 0.3), "lacéré", PLANT_ELEMENT, STONE_ELEMENT)

/** The elements a spell starts from, the ones found as cards. */
export const BASE_ELEMENTS: readonly Element[] = [
    FIRE_ELEMENT, WATER_ELEMENT, PLANT_ELEMENT, STONE_ELEMENT, WIND_ELEMENT, LIGHTNING_ELEMENT,
]

/** What reacts: each compound holds the two elements it comes from. */
export const COMPOUNDS: readonly Compound[] = [STEAM, LAVA, STORM, MUD, BLAZE_ELEMENT, BRAMBLES]

/** What two elements give when they meet, in either order, none when they do not react. */
export function reaction(first: Element, second: Element): Element|null {
    return COMPOUNDS.find(({ first: a, second: b }) => {
        return (a === first && b === second) || (a === second && b === first)
    }) ?? null
}
