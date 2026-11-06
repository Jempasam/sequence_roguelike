import { HeartCount } from "../../../battle/words"
import type { PlugContext } from "../../../battle/Action"

import { AbstractItem } from "../AbstractItem"

/** How many hearts the amulet of the catalog heals at the end of each round. */
const AMULET_HEAL = 1

/** An amulet healing its unit at the end of each round. */
export class Amulet extends AbstractItem {


    constructor(
        /** How many hearts it heals at the end of each round. */
        public readonly heal: number,
    ){
        super("Amulette de vigueur", "mecard/items/amulet.png", ["Soigne ", new HeartCount(heal), " à la fin de chaque round."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundEnded.add(() => unit.hearts.heal(this.heal)))
    }
}

export const AMULET = new Amulet(AMULET_HEAL)
