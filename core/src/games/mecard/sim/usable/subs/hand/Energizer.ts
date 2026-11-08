import type { UnitContext } from "../../../battle/Action"

import { AbstractUsable } from "../AbstractUsable"
import { visual } from "../../../base/Visual"

/** An energizer: the chain of the round played twice. */
export class Energizer extends AbstractUsable {


    constructor(){
        super("Énergisant", visual("usables/energizer"), "La chaîne de ce round est jouée deux fois.")
    }


    protected act({ battle, unit }: UnitContext): void {
        battle.repeatChain(unit)
    }
}

export const ENERGIZER = new Energizer()
