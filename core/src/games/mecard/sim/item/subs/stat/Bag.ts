import type { Attribute } from "../../../base/Attribute"
import { frenchNumber } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"

import { StatItem } from "./StatItem"
import { CARTE } from "../../../base/keywords"

/** How many more cards the bag of the catalog lets the hand hold. */
const BAG_ROOM = 2

/** A bag letting the hand hold more cards. */
export class Bag extends StatItem {


    constructor(
        /** How many more cards it lets the hand hold. */
        room: number,
    ){
        super("Sac sans fond", ["Ta main tient ", frenchNumber(room), " ", CARTE.as("cartes"), " de plus."], room)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.handSize
    }
}

export const BAG = new Bag(BAG_ROOM)
