import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import { HeartCount } from "../../battle/words"
import { SLOWED } from "../../status/subs/Slowness"

import { AbstractUsable } from "./AbstractUsable"
import { BATTLE_ROUND, HEAL } from "../../base/keywords"

/** How many hearts the ice cone of the catalog gives back. */
const CONE_HEAL = 2

/** How many times the ice cone of the catalog may be eaten. */
const CONE_CHARGES = 5

/** How many rounds of slowness the cold of the cone leaves. */
const CONE_SLOWNESS = 1

/** An ice cream cone: it heals, and the cold slows. */
export class IceCone extends AbstractUsable {


    constructor(
        /** How many hearts it gives back. */
        public readonly heal: number,

        /** How many rounds of slowness it leaves. */
        public readonly slowness: number,

        charges = 1,
    ){
        super("Cornet de glace", visual("usables/ice_cone"), [
            "Soigne ", new HeartCount(heal), " + ", HEAL, ", mais te ralentit ", slowness, " ", BATTLE_ROUND, ".",
        ], { charges })
    }


    protected act({ battle, unit }: UnitContext): void {
        unit.hearts.heal(this.heal + unit.stats.heal.value)
        battle.applyStatus(unit, SLOWED, this.slowness)
    }
}

export const ICE_CONE = new IceCone(CONE_HEAL, CONE_SLOWNESS, CONE_CHARGES)
