import { HeartCount } from "../../../battle/words"
import type { PlugContext } from "../../../battle/Action"

import { AbstractItem } from "../AbstractItem"
import { visual } from "../../../base/Visual"

/** How many hearts the fang of the catalog heals on each hit. */
const FANG_HEAL = 1

/** A fang healing its unit on each hit. */
export class Fang extends AbstractItem {


    constructor(
        /** How many hearts it heals on each hit. */
        public readonly heal: number,
    ){
        super("Croc vampirique", visual("items/fang"), ["Chaque coup qui touche soigne ", new HeartCount(heal), "."])
    }


    public init({ unit, hold }: PlugContext): void {
        hold(unit.hitting.add(() => unit.hearts.heal(this.heal)))
    }
}

export const FANG = new Fang(FANG_HEAL)
