import type { UnitContext } from "../../../battle/Action"
import type { Card } from "../../../card/Card"
import { COMPOUND_CARDS, ELEMENT_CARDS } from "../../../card/subs/spell/ElementCard"
import type { Element } from "../../../element/Element"
import { reaction } from "../../../element/reactions"
import { ritualElementOf } from "../../../status/subs/RitualStatus"

import { AbstractUsable } from "../AbstractUsable"
import { visual } from "../../../base/Visual"

/** The card of an element, none for one no card carries. */
function cardOf(element: Element): Card|undefined {
    return [...ELEMENT_CARDS, ...COMPOUND_CARDS].find(card => card.element === element)
}

/** The elements the rituals of a unit keep, each once. */
function ritualElements({ unit }: UnitContext): Element[] {
    const kept = [...unit.statuses.keys()].map(ritualElementOf)
    return kept.filter((element, at): element is Element => element !== null && kept.indexOf(element) === at)
}

/** What two of the elements reacting give, each mix once. */
function mixes(elements: readonly Element[]): Element[] {
    const found = new Set<Element>()
    elements.forEach((first, at) => {
        for(const second of elements.slice(at + 1)){
            const mixed = reaction(first, second)
            if(mixed) found.add(mixed)
        }
    })
    return [...found]
}

/**
 * A wizard staff: the hand gets one of the elements its rituals keep, drawn at random, or a mix of two of
 * them drawn at random instead when some of them react.
 */
export class WizardStaff extends AbstractUsable {


    constructor(){
        super(
            "Bâton de Sorcier", visual("usables/mixer"),
            [
                "Ajoute à ta main un des éléments de tes rituels, tiré au hasard, ou un mélange de deux d'entre eux ",
                "s'il en existe. 2 utilisations, rechargées à chaque combat.",
            ],
            { charges: 2, refill: "battle" },
        )
    }


    protected act(ctx: UnitContext): void {
        const { battle, unit } = ctx
        const elements = ritualElements(ctx)
        const mixed = mixes(elements)
        const chosen = battle.rng.pick(mixed.length > 0 ? mixed : elements)
        const card = chosen && cardOf(chosen)
        if(card) battle.giveCard(unit, card)
    }
}

export const WIZARD_STAFF = new WizardStaff()
