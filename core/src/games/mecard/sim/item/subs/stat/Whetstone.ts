import { joinText } from "../../../../../../semantic"
import type { Attribute } from "../../../base/Attribute"
import { damage } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"
import { SLASH } from "../../../card/subs/attack/Slash"
import { SWEEP } from "../../../card/subs/attack/Sweep"
import { THRUST } from "../../../card/subs/attack/Thrust"

import { StatItem } from "./StatItem"

/** How many hearts the whetstone of the catalog adds to each blow. */
const WHETSTONE_BONUS = 1

/** The cards whose blows the strength of a unit adds to. */
const BLOWS = [SLASH, THRUST, SWEEP]

/** A stone adding to every blow. */
export class Whetstone extends StatItem {


    constructor(
        /** How many hearts it adds to each blow. */
        bonus: number,
    ){
        super(
            "Pierre à aiguiser",
            ["+", damage(bonus, "physical"), " de force : à chaque coup, ", ...joinText(BLOWS, ", "), "."], bonus,
        )
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.strength
    }
}

export const WHETSTONE = new Whetstone(WHETSTONE_BONUS)
