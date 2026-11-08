import { meters } from "../../../battle/words"

import { StatItem } from "./StatItem"
import { visual } from "../../../base/Visual"

/** How much farther the spyglass of the catalog lets the aim look, in meters. */
const SPYGLASS_RANGE = 2

/** A spyglass letting the aim look farther. */
export const SPYGLASS = new StatItem("Longue-vue", visual("items/spyglass"), [
    {
        stat: stats => stats.aimRange,
        amount: SPYGLASS_RANGE,
        shown: meters(SPYGLASS_RANGE),
        text: ["de vision"],
    },
])
