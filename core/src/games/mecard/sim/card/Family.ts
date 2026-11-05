import { rgba } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"

import { ACTION, ELEMENT, MODULE, POTION, PREPARATION } from "./CardType"
import type { CardType } from "./CardType"

/** A family of cards, what the player reads them as: the color of their band, and the word at their foot. */
export class Family {


    constructor(
        /** What the foot of a card of it says, short enough for its width. */
        public readonly word: string,

        /** The color of its band. */
        public readonly color: Rgba,

        /**
         * Is a card of it holding cards drawn as them alone, in a frame of its color, without its band and
         * its name? A card holding cards shows them under its band and its name otherwise.
         */
        public readonly bare = false,
    ){}
}

export const ACTION_FAMILY = new Family("action", rgba(0.35, 0.6, 1))
export const MODIFIER_FAMILY = new Family("modif.", rgba(0.7, 0.45, 1))
export const LAUNCHER_FAMILY = new Family("lanceur", rgba(0.25, 0.7, 0.6))
export const ELEMENT_FAMILY = new Family("élément", rgba(0.4, 0.85, 0.45))
export const POTION_FAMILY = new Family("potion", rgba(0.6, 0.9, 0.2))
export const MODULE_FAMILY = new Family("module", rgba(0.6, 0.7, 0.75))
export const PREP_FAMILY = new Family("prépa.", rgba(1, 0.8, 0.3))
export const FUSION_FAMILY = new Family("collage", rgba(1, 0.6, 0.2), true)
export const NAMED_FUSION_FAMILY = new Family("collage", rgba(0.95, 0.35, 0.35))
export const MERGED_FAMILY = new Family("mélange", rgba(0.3, 0.85, 0.9))
export const RANDOM_FAMILY = new Family("hasard", rgba(0.95, 0.45, 0.75))

/** The look of a card the viewer may not see: its back. */
export const HIDDEN_FAMILY = new Family("cachée", rgba(0.4, 0.38, 0.48))

/**
 * The family of a card by what it takes and gives: a card changing actions is a modifier, a card making them
 * from anything else, an element, a potion, a module, is a launcher.
 */
export function familyOfTypes(output: CardType<unknown>, input: CardType<unknown>|null): Family {
    if(output === PREPARATION) return PREP_FAMILY
    if(output === ELEMENT) return ELEMENT_FAMILY
    if(output === POTION) return POTION_FAMILY
    if(output === MODULE) return MODULE_FAMILY
    if(output === ACTION && input === ACTION) return MODIFIER_FAMILY
    if(output === ACTION && input !== null) return LAUNCHER_FAMILY
    return ACTION_FAMILY
}
