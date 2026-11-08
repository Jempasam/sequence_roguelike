import { joinText } from "../../../../../../semantic"
import { damage } from "../../../battle/words"
import { SLASH } from "../../../card/subs/attack/Slash"
import { SWEEP } from "../../../card/subs/attack/Sweep"
import { THRUST } from "../../../card/subs/attack/Thrust"

import { StatItem } from "./StatItem"
import { visual } from "../../../base/Visual"

/** How many hearts the whetstone of the catalog adds to each blow. */
const WHETSTONE_BONUS = 1

/** The cards whose blows the strength of a unit adds to. */
const BLOWS = [SLASH, THRUST, SWEEP]

/** A stone adding to every blow. */
export const WHETSTONE = new StatItem("Pierre à aiguiser", visual("items/whetstone"), [
    {
        stat: stats => stats.strength,
        amount: WHETSTONE_BONUS,
        shown: damage(WHETSTONE_BONUS, "physical"),
        text: ["de force : à chaque coup, ", ...joinText(BLOWS, ", ")],
    },
])
