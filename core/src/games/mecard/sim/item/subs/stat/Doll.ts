import { HeartCount } from "../../../battle/words"

import { StatItem } from "./StatItem"

/** How many hearts the doll of the catalog adds to the life of each summon. */
const DOLL_BONUS = 1

/** A doll adding to the life of every body its unit summons: summoning. */
export const DOLL = new StatItem("Poupée de chiffon", "mecard/items/doll.png", [
    {
        stat: stats => stats.summon,
        amount: DOLL_BONUS,
        shown: new HeartCount(DOLL_BONUS),
        text: "de vie à chacune de tes invocations",
    },
])
