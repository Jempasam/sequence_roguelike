import type { Attribute } from "../../../base/Attribute"
import { frenchNumber } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"

import { StatItem } from "./StatItem"
import { CARTE } from "../../../base/keywords"

/** How many more cards the grimoire of the catalog lets the chain hold. */
const GRIMOIRE_ROOM = 1

/** A grimoire letting the chain hold more cards. */
export class Grimoire extends StatItem {


    constructor(
        /** How many more cards it lets the chain hold. */
        room: number,
    ){
        super("Grimoire", "mecard/items/grimoire.png", ["Ta chaîne tient ", frenchNumber(room), " ", CARTE, " de plus."], room)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.chainSize
    }
}

export const GRIMOIRE = new Grimoire(GRIMOIRE_ROOM)
