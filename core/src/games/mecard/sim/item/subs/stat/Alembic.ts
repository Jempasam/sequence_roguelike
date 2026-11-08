import { counted } from "../../../battle/words"

import { StatItem } from "./StatItem"
import { visual } from "../../../base/Visual"

/** How many levels the alembic of the catalog adds to each potion. */
const ALEMBIC_BONUS = 1

/** An alembic adding to every potion its unit applies: alchemy. */
export const ALEMBIC = new StatItem("Alambic", visual("items/alembic"), [
    {
        stat: stats => stats.alchemy,
        amount: ALEMBIC_BONUS,
        shown: counted(ALEMBIC_BONUS, "niveau"),
        text: "de puissance de potion",
    },
])
