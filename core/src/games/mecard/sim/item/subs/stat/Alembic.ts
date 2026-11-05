import type { Attribute } from "../../../base/Attribute"
import { counted } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"

import { StatItem } from "./StatItem"

/** How many levels the alembic of the catalog adds to each potion. */
const ALEMBIC_BONUS = 1

/** An alembic adding to every potion its unit applies: alchemy. */
export class Alembic extends StatItem {


    constructor(
        /** How many levels it adds to each potion. */
        bonus: number,
    ){
        super("Alambic", ["+", counted(bonus, "niveau"), " à chaque potion que tu appliques."], bonus)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.alchemy
    }
}

export const ALEMBIC = new Alembic(ALEMBIC_BONUS)
