import { CARTE } from "../../../base/keywords"

import { StatItem } from "./StatItem"

/** How many more cards the satchel of the catalog draws at the start of a battle. */
const SATCHEL_DRAW = 2

/** A satchel drawing more cards at the start of a battle. */
export const SATCHEL = new StatItem("Besace", "mecard/items/satchel.png", [
    {
        stat: stats => stats.firstDraw,
        amount: SATCHEL_DRAW,
        text: [CARTE.as("cartes"), " piochées au début d'un combat"],
    },
])
