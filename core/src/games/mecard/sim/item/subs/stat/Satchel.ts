import { CARTE } from "../../../base/keywords"

import { StatItem } from "./StatItem"
import { visual } from "../../../base/Visual"

/** How many more cards the satchel of the catalog draws at the start of a battle. */
const SATCHEL_DRAW = 2

/** A satchel drawing more cards at the start of a battle. */
export const SATCHEL = new StatItem("Besace", visual("items/satchel"), [
    {
        stat: stats => stats.firstDraw,
        amount: SATCHEL_DRAW,
        text: [CARTE.as("cartes"), " piochées au début d'un combat"],
    },
])
