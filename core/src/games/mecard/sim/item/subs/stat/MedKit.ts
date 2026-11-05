import type { Attribute } from "../../../base/Attribute"
import { HeartCount } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"

import { StatItem } from "./StatItem"
import { CARTE } from "../../../base/keywords"

/** How many hearts the kit of the catalog adds to each heart given. */
const MED_KIT_BONUS = 1

/** A kit adding to every heart its unit's cards give: healing. */
export class MedKit extends StatItem {


    constructor(
        /** How many hearts it adds to each heart given. */
        bonus: number,
    ){
        super("Trousse de soin", ["+", new HeartCount(bonus), " à chaque soin et cœur que donnent tes ", CARTE.as("cartes"), "."], bonus)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.heal
    }
}

export const MED_KIT = new MedKit(MED_KIT_BONUS)
