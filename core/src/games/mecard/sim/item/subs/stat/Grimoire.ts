import { CARTE } from "../../../base/keywords"

import { StatItem } from "./StatItem"

/** How many more cards the grimoire of the catalog lets the chain hold. */
const GRIMOIRE_ROOM = 1

/** A grimoire letting the chain hold more cards. */
export const GRIMOIRE = new StatItem("Grimoire", "mecard/items/grimoire.png", [
    {
        stat: stats => stats.chainSize,
        amount: GRIMOIRE_ROOM,
        text: [CARTE, " dans ta chaîne"],
    },
])
