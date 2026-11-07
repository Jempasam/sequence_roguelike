import { HeartCount } from "../../../battle/words"
import { CARTE } from "../../../base/keywords"

import { StatItem } from "./StatItem"

/** How many hearts the kit of the catalog adds to each heart given. */
const MED_KIT_BONUS = 1

/** A kit adding to every heart its unit's cards give: healing. */
export const MED_KIT = new StatItem("Trousse de soin", "mecard/items/med_kit.png", [
    {
        stat: stats => stats.heal,
        amount: MED_KIT_BONUS,
        shown: new HeartCount(MED_KIT_BONUS),
        text: ["de soin"],
    },
])
