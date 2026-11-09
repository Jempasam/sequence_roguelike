import { frenchNumber } from "../../../battle/words"

import { StatItem } from "./StatItem"
import { visual } from "../../../base/Visual"

/** How much farther the spyglass of the catalog lets its shots reach, as a factor. */
const SPYGLASS_RANGE = 1

/** A spyglass letting the shots reach farther. */
export const SPYGLASS = new StatItem("Longue-vue", visual("items/spyglass"), [
    {
        stat: stats => stats.throwRange,
        amount: SPYGLASS_RANGE,
        shown: [frenchNumber(SPYGLASS_RANGE * 100), " %"],
        text: "de portée",
    },
])
