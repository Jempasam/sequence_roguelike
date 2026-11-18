import { visual } from "../../base/Visual"
import type { UnitContext } from "../../battle/Action"
import { RESURRECTED } from "../../status/subs/Resurrection"

import { AbstractUsable } from "./AbstractUsable"

/** The level of the resurrection the usable gives: it lasts the round it is used in. */
const RESURRECTION_LEVEL = 1

/** A resurrection to carry: once a battle, it protects its user from death for the round. */
export class ResurrectionUsable extends AbstractUsable {


    constructor(
        /** The level of the resurrection it gives. */
        public readonly level: number,
    ){
        super("Résurrection", visual("usables/resurrection"), ["Donne ", RESURRECTED, " ", level, "."], {
            charges: 1, refill: "battle",
        })
    }


    protected act({ battle, unit }: UnitContext): void {
        battle.applyStatus(unit, RESURRECTED, this.level)
    }
}

export const RESURRECTION = new ResurrectionUsable(RESURRECTION_LEVEL)
