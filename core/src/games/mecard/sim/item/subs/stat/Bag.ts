import { CARTE } from "../../../base/keywords"

import { StatItem } from "./StatItem"

/** How many more cards the bag of the catalog lets the hand hold. */
const BAG_ROOM = 2

/** A bag letting the hand hold more cards. */
export const BAG = new StatItem("Sac sans fond", "mecard/items/bag.png", [
    {
        stat: stats => stats.handSize,
        amount: BAG_ROOM,
        text: [CARTE.as("cartes"), " dans ta main"],
    },
])
