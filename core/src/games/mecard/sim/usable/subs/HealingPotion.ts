import { HeartCount } from "../../battle/words"
import type { UnitContext } from "../../battle/Action"

import { AbstractUsable } from "./AbstractUsable"

/** How many hearts the healing potion of the catalog gives back. */
const POTION_HEAL = 3

/** A potion giving back hearts. */
export class HealingPotion extends AbstractUsable {


    constructor(
        /** How many hearts it gives back. */
        public readonly heal: number,
    ){
        super("Potion de soin", ["Soigne ", new HeartCount(heal), " + soin."])
    }


    protected act({ unit }: UnitContext): void {
        unit.hearts.heal(this.heal + unit.stats.heal.value)
    }
}

export const HEALING_POTION = new HealingPotion(POTION_HEAL)
