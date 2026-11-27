import { CARTE, FORCE } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { UnitContext } from "../../../battle/Action"
import { DamageType } from "../../../battle/DamageType"
import * as Family from "../../../battle/mecanic/family"

import { AbstractUsable } from "../AbstractUsable"

/** How many times the reflex is used in each battle. */
const REFLEX_CHARGES = 3

/**
 * A fighter's reflex: a card drawn at random from the draw piles and the discards among those of the family
 * of physical damage and of strength.
 */
export class FighterReflex extends AbstractUsable {


    constructor(){
        super("Réflexe de combattant", visual("usables/strength_elixir", { coloration: [0.9, 0.75, 0.2] }), [
            "Pioche au hasard, dans ta pioche ou ta défausse, une ", CARTE, " ",
            ...Family.familyText(DamageType.PHYSICAL, FORCE), `. ${REFLEX_CHARGES} fois par combat.`,
        ], { charges: REFLEX_CHARGES, refill: "battle" })
    }


    protected act({ battle, unit }: UnitContext): void {
        const { decks } = unit
        const fitting = Family.ofFamily([...decks.piles, ...decks.discards], DamageType.PHYSICAL, FORCE)
        const card = battle.rng.pick(fitting)
        if(!card) return
        const deck = decks.takeCard(card)
        if(deck === null) return
        if(!battle.giveCard(unit, card, deck)) unit.decks.discard(card)
    }
}

export const FIGHTER_REFLEX = new FighterReflex()
