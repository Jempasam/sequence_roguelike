import { HEAL } from "../../base/keywords"
import { HeartCount } from "../../battle/words"
import type { UnitContext } from "../../battle/Action"

import { AbstractUsable } from "./AbstractUsable"
import { visual } from "../../base/Visual"

/** How many hearts the healing potion of the catalog gives back. */
const POTION_HEAL = 2

/** How many times the healing potion of the catalog may be drunk. */
const POTION_CHARGES = 6

/** A potion giving back hearts. */
export class HealingPotion extends AbstractUsable {


    constructor(
        /** How many hearts it gives back. */
        public readonly heal: number,

        charges = 1,
    ){
        super("Potion de soin", visual("usables/healing_potion"), ["Soigne ", new HeartCount(heal), " + ", HEAL, "."], { charges })
    }


    protected act({ unit }: UnitContext): void {
        unit.hearts.heal(this.heal + unit.stats.heal.value)
    }
}

export const HEALING_POTION = new HealingPotion(POTION_HEAL, POTION_CHARGES)
