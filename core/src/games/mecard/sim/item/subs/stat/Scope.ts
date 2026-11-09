import { PRECISION } from "../../../base/keywords"

import { StatItem } from "./StatItem"
import { visual } from "../../../base/Visual"

/** How many hearts the scope of the catalog adds to each shot. */
const SCOPE_BONUS = 1

/** A scope adding to every shot: precision. */
export const SCOPE = new StatItem("Viseur", visual("items/scope"), [
    {
        stat: stats => stats.precision,
        amount: SCOPE_BONUS,
        text: [PRECISION],
    },
])
