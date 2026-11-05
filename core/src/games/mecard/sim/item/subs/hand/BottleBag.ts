import type { UnitContext } from "../../../battle/Action"
import type { Card } from "../../../card/Card"
import { BOTTLE, BottleCard } from "../../../card/subs/potion/PotionActions"

import { DrawnItem } from "./DrawnItem"

/** A bag of bottles: a bottle in hand after each draw, when the hand holds none and has room. */
export class BottleBag extends DrawnItem {


    constructor(
        /** The bottle it gives. */
        public readonly bottle: Card,
    ){
        super("Sac à bouteilles", ["Après la pioche, sans bouteille en main, en donne une : ", bottle, "."])
    }


    protected drawn({ battle, unit }: UnitContext): void {
        if(unit.hand.some(card => card instanceof BottleCard)) return
        battle.giveCard(unit, this.bottle)
    }
}

export const BOTTLE_BAG = new BottleBag(BOTTLE)
