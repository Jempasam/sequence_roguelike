import type { Attribute } from "../../../base/Attribute"
import { frenchNumber } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"

import { StatItem } from "./StatItem"

/** How much farther the boots of the catalog take every move, added to the move factor. */
const BOOTS_MOVE = 0.5

/** Boots taking every move farther. */
export class Boots extends StatItem {


    constructor(
        /** How much farther it takes every move, added to the move factor. */
        move: number,
    ){
        super("Bottes de sept lieues", ["Tous tes déplacements vont ", frenchNumber(move * 100), " % plus loin."], move)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.move
    }
}

export const BOOTS = new Boots(BOOTS_MOVE)
