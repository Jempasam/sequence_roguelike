import { CARTE } from "../../../base/keywords"

import { StatItem } from "./StatItem"
import { visual } from "../../../base/Visual"

/** How many more cards the bag of the catalog lets the hand hold. */
const BAG_ROOM = 2

/** A bag letting the hand hold more cards. */
export const BAG = new StatItem("Sac sans fond", visual("items/bag"), [
    {
        stat: stats => stats.handSize,
        amount: BAG_ROOM,
        text: [CARTE.as("cartes"), " dans ta main"],
    },
])
