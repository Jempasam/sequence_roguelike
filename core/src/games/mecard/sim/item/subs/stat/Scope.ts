import { damage } from "../../../battle/words"

import { StatItem } from "./StatItem"

/** How many hearts the scope of the catalog adds to each shot. */
const SCOPE_BONUS = 1

/** A scope adding to every shot: precision. */
export const SCOPE = new StatItem("Viseur", "mecard/items/scope.png", [
    {
        stat: stats => stats.precision,
        amount: SCOPE_BONUS,
        shown: damage(SCOPE_BONUS, "physical"),
        text: "de précision",
    },
])
