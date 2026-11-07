import { frenchNumber } from "../../../battle/words"

import { StatItem } from "./StatItem"

/** How much farther the sling of the catalog takes what is thrown, added to the reach factor. */
const SLING_REACH = 0.5

/** A sling taking farther everything thrown or shot: reach. */
export const SLING = new StatItem("Fronde", "mecard/items/sling.png", [
    {
        stat: stats => stats.throwRange,
        amount: SLING_REACH,
        shown: [frenchNumber(SLING_REACH * 100), " %"],
        text: "de portée",
    },
])
