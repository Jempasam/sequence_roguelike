import type { UnitContext } from "../../../battle/Action"
import type { Card } from "../../../card/Card"
import { gives } from "../../../card/Card"
import { POTION } from "../../../card/CardType"
import { POISON, SLOWNESS, WEAKNESS } from "../../../card/subs/potion/PotionCard"

import { AbstractUsable } from "../AbstractUsable"
import { DECK } from "../../../base/keywords"

/** How many charges the bag of plants of the catalog holds, filled again at each battle. */
const PLANT_BAG_CHARGES = 3

/**
 * A bag of plants: a potion in hand, drawn among some potions of its own and every potion still in the
 * deck or the hand of the unit.
 */
export class PlantBag extends AbstractUsable {


    constructor(
        /** The potions it may always give. */
        public readonly potions: readonly Card[],

        charges: number,
    ){
        super("Sac de plantes", "mecard/usables/plant_bag.png", [
            "Donne une potion, parmi quelques potions de base et celles encore dans le ", DECK, " ou la main. ",
            `${charges} charges, rechargées à chaque combat.`,
        ], { charges, refill: "battle" })
    }


    protected act({ battle, unit }: UnitContext): void {
        const held = [...unit.decks.piles, ...unit.hand].filter(card => gives(card, POTION))
        const potion = battle.rng.pick([...new Set([...this.potions, ...held])])
        if(potion) battle.giveCard(unit, potion)
    }
}

export const PLANT_BAG = new PlantBag([POISON, SLOWNESS, WEAKNESS], PLANT_BAG_CHARGES)
