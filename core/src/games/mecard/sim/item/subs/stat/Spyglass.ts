import { meters } from "../../../battle/words"
import { AIM } from "../../../card/subs/movement/Aim"

import { StatItem } from "./StatItem"

/** How much farther the spyglass of the catalog lets the aim look, in meters. */
const SPYGLASS_RANGE = 2

/** A spyglass letting the aim look farther. */
export const SPYGLASS = new StatItem("Longue-vue", "mecard/items/spyglass.png", [
    {
        stat: stats => stats.aimRange,
        amount: SPYGLASS_RANGE,
        shown: meters(SPYGLASS_RANGE),
        text: ["de vision"],
    },
])
