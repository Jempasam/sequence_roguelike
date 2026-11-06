import type { Attribute } from "../../../base/Attribute"
import { frenchNumber } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"

import { StatItem } from "./StatItem"

/** How much farther the sling of the catalog takes what is thrown, added to the reach factor. */
const SLING_REACH = 0.5

/** A sling taking farther everything thrown or shot: reach. */
export class Sling extends StatItem {


    constructor(
        /** How much farther it takes what is thrown, added to the reach factor. */
        reach: number,
    ){
        super("Fronde", "mecard/items/sling.png", ["Tout ce que tu lances ou tires va ", frenchNumber(reach * 100), " % plus loin."], reach)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.throwRange
    }
}

export const SLING = new Sling(SLING_REACH)
