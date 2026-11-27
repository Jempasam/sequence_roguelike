import { ALCHEMY, ALLONGE, FORCE, HEAL, PORTEE, PRECISION, SUMMON_STAT } from "../../../base/keywords"
import { HeartCount } from "../../../battle/words"

import { StatItem } from "./StatItem"
import { visual } from "../../../base/Visual"

/** How much one copy of the power adds to each stat counted in hearts or in levels. */
const POWER_BONUS = 1

/** How much farther one copy of the power lets blows and throws go, added to the reach factors. */
const POWER_REACH = 0.1

/** The reach of one copy of the power, as said in its text. */
const SHOWN_REACH = [POWER_REACH * 100, " %"]

/**
 * The strength the foes gather floor after floor, one copy after the other: every stat of their blows and
 * their cards, but not their moves, which their combos count on. It is never found as loot.
 */
export const POWER = new StatItem("Puissance", visual("items/power"), [
    { stat: stats => stats.strength, amount: POWER_BONUS, text: [FORCE] },
    { stat: stats => stats.precision, amount: POWER_BONUS, text: [PRECISION] },
    { stat: stats => stats.heal, amount: POWER_BONUS, shown: new HeartCount(POWER_BONUS), text: [HEAL] },
    {
        stat: stats => stats.summon,
        amount: POWER_BONUS,
        shown: new HeartCount(POWER_BONUS),
        text: [SUMMON_STAT],
    },
    { stat: stats => stats.alchemy, amount: POWER_BONUS, text: [ALCHEMY] },
    { stat: stats => stats.meleeRange, amount: POWER_REACH, shown: SHOWN_REACH, text: ["d'", ALLONGE] },
    { stat: stats => stats.throwRange, amount: POWER_REACH, shown: SHOWN_REACH, text: ["de ", PORTEE] },
])
