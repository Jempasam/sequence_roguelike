import { Rarity } from "../Rarity"

import { ActionCard } from "./ActionCard"
import { still } from "./tools/previews"
import { CARTE } from "../../base/keywords"

/**
 * What stands for a card a viewer may not see, in a battle sent to it: the cards of a draw pile. It is
 * never drawn by the viewer, which loads the next state before anyone draws, and plays nothing if it is.
 */
export const SECRET_CARD = new ActionCard("Carte cachée", ["Une ", CARTE, " que tu ne vois pas."], Rarity.COMMON, {
    use: function* (){ /* Nothing to play. */ },
    preview: ({ pose }) => still(pose),
})
