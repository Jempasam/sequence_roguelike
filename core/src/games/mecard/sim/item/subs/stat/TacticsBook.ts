import { CARTE } from "../../../base/keywords"

import { StatItem } from "./StatItem"
import { visual } from "../../../base/Visual"

/** How many more cards the book of tactics of the catalog draws each round, and at the start of a battle. */
const TACTICS_DRAW = 1

/** A book of tactics drawing more cards at each round and at the start of a battle. */
export const TACTICS_BOOK = new StatItem("Carnet de tactiques", visual("items/tactics_book"), [
    {
        stat: stats => stats.draw,
        amount: TACTICS_DRAW,
        text: [CARTE, " piochée à chaque round"],
    },
    {
        stat: stats => stats.firstDraw,
        amount: TACTICS_DRAW,
        text: [CARTE, " piochée au début d'un combat"],
    },
])
