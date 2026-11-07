import { frenchNumber } from "../../../battle/words"

import { StatItem } from "./StatItem"

/** How much farther the boots of the catalog take every move, added to the move factor. */
const BOOTS_MOVE = 0.5

/** Boots taking every move farther. */
export const BOOTS = new StatItem("Bottes de sept lieues", "mecard/items/boots.png", [
    {
        stat: stats => stats.move,
        amount: BOOTS_MOVE,
        shown: [frenchNumber(BOOTS_MOVE * 100), " %"],
        text: "de portée de déplacement",
    },
])
