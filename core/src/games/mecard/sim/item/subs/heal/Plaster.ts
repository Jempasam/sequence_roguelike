import { HeartCount } from "../../../battle/words"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import type { Survivor } from "../../Item"

import { AbstractItem } from "../AbstractItem"

/** How many hearts the plaster of the catalog mends after a fight in which its carrier fell. */
const PLASTER_HEAL = 1

/** A plaster: a character who fell in a fight that is won comes out of it with more hearts. */
export class Plaster extends AbstractItem {


    constructor(
        /** How many hearts more it mends. */
        public readonly heal: number,
    ){
        super("Pansement", visual("items/plaster"), [
            "Éliminé dans un combat gagné, se relève avec ", new HeartCount(heal), " de plus.",
        ])
    }


    public init(ctx: PlugContext): void {
        void ctx
    }

    public afterFight({ hearts, fell }: Survivor): void {
        if(!fell) return
        for(const heart of hearts.filter(each => each.isEmpty).slice(0, this.heal)) heart.isEmpty = false
    }
}

export const PLASTER = new Plaster(PLASTER_HEAL)
