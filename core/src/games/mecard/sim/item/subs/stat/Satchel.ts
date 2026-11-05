import type { Attribute } from "../../../base/Attribute"
import { frenchNumber } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"

import { StatItem } from "./StatItem"
import { CARTE } from "../../../base/keywords"

/** How many more cards the satchel of the catalog draws at the start of a battle. */
const SATCHEL_DRAW = 2

/** A satchel drawing more cards at the start of a battle. */
export class Satchel extends StatItem {


    constructor(
        /** How many more cards it draws at the start of a battle. */
        draw: number,
    ){
        super("Besace", ["Tu pioches ", frenchNumber(draw), " ", CARTE.as("cartes"), " de plus au début d'un combat."], draw)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.firstDraw
    }
}

export const SATCHEL = new Satchel(SATCHEL_DRAW)
