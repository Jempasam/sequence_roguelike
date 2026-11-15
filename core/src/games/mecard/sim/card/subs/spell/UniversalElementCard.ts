import type { Text } from "../../../../../../semantic"
import type { Card } from "../../Card"
import { Rarity } from "../../Rarity"
import { BASE_ELEMENTS } from "../../../element/reactions"
import type { Element } from "../../../element/Element"

import { ElementCard } from "./ElementCard"

/** The name of the element card standing for any of the base elements. */
const UNIVERSAL_NAME = "Élément universel"

/** Every universal element, by the element it gives, in the order of {@link BASE_ELEMENTS}. */
const UNIVERSAL_VARIANTS = new Map<Text, Card>()

/** An element card whose element is chosen among the base ones, rather than being its own. */
export class UniversalElementCard extends ElementCard {


    constructor(element: Element){
        super(element, Rarity.RARE, UNIVERSAL_NAME)
    }


    public readonly group = UNIVERSAL_VARIANTS

    public override variants(): ReadonlyMap<Text, Card> {
        return UNIVERSAL_VARIANTS
    }

    public override variantFor(): Card {
        return UNIVERSAL_ELEMENTS[0]
    }
}

/** Every universal element, by element: the only instances, so one is told from another by its place here. */
export const UNIVERSAL_ELEMENTS: readonly UniversalElementCard[] = BASE_ELEMENTS.map(element => {
    return new UniversalElementCard(element)
})

for(const card of UNIVERSAL_ELEMENTS) UNIVERSAL_VARIANTS.set(card.element, card)
