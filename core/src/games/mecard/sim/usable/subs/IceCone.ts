import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import { HeartCount } from "../../battle/words"
import { SLOWED } from "../../status/subs/Slowness"

import { AbstractUsable } from "./AbstractUsable"

/** How many hearts the ice cone of the catalog gives back. */
const CONE_HEAL = 3

/** How many rounds of slowness the cold of the cone leaves. */
const CONE_SLOWNESS = 1

/** An ice cream cone: it heals, and the cold slows. */
export class IceCone extends AbstractUsable {


    constructor(
        /** How many hearts it gives back. */
        public readonly heal: number,

        /** How many rounds of slowness it leaves. */
        public readonly slowness: number,
    ){
        super("Cornet de glace", visual("usables/ice_cone"), [
            "Soigne ", new HeartCount(heal), " + soin, mais te ralentit ", slowness, " round.",
        ])
    }


    protected act({ battle, unit }: UnitContext): void {
        unit.hearts.heal(this.heal + unit.stats.heal.value)
        battle.applyStatus(unit, SLOWED, this.slowness)
    }
}

export const ICE_CONE = new IceCone(CONE_HEAL, CONE_SLOWNESS)
