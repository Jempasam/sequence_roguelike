import { concat } from "../../../../../../semantic"
import { ELEMENT } from "../../CardType"
import type { Element } from "../../../element/Element"
import {
    BLAZE_ELEMENT, BRAMBLES, COMPOUNDS, LAVA, MUD, STEAM, STORM,
} from "../../../element/reactions"
import { FIRE_ELEMENT } from "../../../element/subs/Fire"
import { LIGHTNING_ELEMENT } from "../../../element/subs/Lightning"
import { PLANT_ELEMENT } from "../../../element/subs/Plant"
import { STONE_ELEMENT } from "../../../element/subs/Stone"
import { WATER_ELEMENT } from "../../../element/subs/Water"
import { WIND_ELEMENT } from "../../../element/subs/Wind"

import { AbstractCard } from "../AbstractCard"
import { Rarity } from "../../Rarity"

/** An element card: what a spell, an aura or a conjuration is cast with. */
export class ElementCard extends AbstractCard<Element> {


    public readonly output = ELEMENT
    public readonly input = null

    constructor(
        /** The element it gives. */
        public readonly element: Element,

        rarity: Rarity,
    ){
        super(element.name, [
            concat("Négatif : ", element.negativeText, "."),
            concat("Positif : ", element.positiveText, "."),
            concat("Invoque : ", element.invokedText, "."),
        ], rarity)
    }


    public get(): Element {
        return this.element
    }
}

export const FIRE = new ElementCard(FIRE_ELEMENT, Rarity.COMMON)
export const WATER = new ElementCard(WATER_ELEMENT, Rarity.COMMON)
export const PLANT = new ElementCard(PLANT_ELEMENT, Rarity.COMMON)
export const STONE = new ElementCard(STONE_ELEMENT, Rarity.COMMON)
export const WIND = new ElementCard(WIND_ELEMENT, Rarity.COMMON)
export const LIGHTNING = new ElementCard(LIGHTNING_ELEMENT, Rarity.COMMON)

/** The elements found as cards. */
export const ELEMENT_CARDS: readonly ElementCard[] = [FIRE, WATER, PLANT, STONE, WIND, LIGHTNING]

export const STEAM_CARD = new ElementCard(STEAM, Rarity.RARE)
export const LAVA_CARD = new ElementCard(LAVA, Rarity.RARE)
export const STORM_CARD = new ElementCard(STORM, Rarity.RARE)
export const MUD_CARD = new ElementCard(MUD, Rarity.RARE)
export const BLAZE_CARD = new ElementCard(BLAZE_ELEMENT, Rarity.RARE)
export const BRAMBLES_CARD = new ElementCard(BRAMBLES, Rarity.RARE)

/** What two elements give as they react, never found as loot. */
export const COMPOUND_CARDS: readonly ElementCard[] = [
    STEAM_CARD, LAVA_CARD, STORM_CARD, MUD_CARD, BLAZE_CARD, BRAMBLES_CARD,
]

/**
 * The card of a compound.
 *
 * @throws {@link Error} For an element reactions do not give: every compound has its card.
 */
export function compoundCard(element: Element): ElementCard {
    const card = COMPOUND_CARDS.find(each => each.element === element)
    if(!card) throw new Error(`No card gives the element ${element}, among the ${COMPOUNDS.length} compounds.`)
    return card
}
