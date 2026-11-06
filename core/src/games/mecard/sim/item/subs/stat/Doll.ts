import type { Attribute } from "../../../base/Attribute"
import { HeartCount } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"

import { StatItem } from "./StatItem"

/** How many hearts the doll of the catalog adds to the life of each summon. */
const DOLL_BONUS = 1

/** A doll adding to the life of every body its unit summons: summoning. */
export class Doll extends StatItem {


    constructor(
        /** How many hearts it adds to each summon. */
        bonus: number,
    ){
        super("Poupée de chiffon", "mecard/items/doll.png", ["+", new HeartCount(bonus), " de vie à chacune de tes invocations."], bonus)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.summon
    }
}

export const DOLL = new Doll(DOLL_BONUS)
