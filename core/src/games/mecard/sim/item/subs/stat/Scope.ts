import type { Attribute } from "../../../base/Attribute"
import { damage } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"

import { StatItem } from "./StatItem"

/** How many hearts the scope of the catalog adds to each shot. */
const SCOPE_BONUS = 1

/** A scope adding to every shot: precision. */
export class Scope extends StatItem {


    constructor(
        /** How many hearts it adds to each shot. */
        bonus: number,
    ){
        super("Viseur", ["+", damage(bonus, "physical"), " de précision : à chaque tir."], bonus)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.precision
    }
}

export const SCOPE = new Scope(SCOPE_BONUS)
