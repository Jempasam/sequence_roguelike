import type { Attribute } from "../../../base/Attribute"
import { frenchNumber } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"

import { StatItem } from "./StatItem"
import { CARTE } from "../../../base/keywords"

/** How many more cards the book of tactics of the catalog draws each round. */
const TACTICS_DRAW = 1

/** A book of tactics drawing more cards at each round. */
export class TacticsBook extends StatItem {


    constructor(
        /** How many more cards it draws at each round. */
        draw: number,
    ){
        super("Carnet de tactiques", "mecard/items/tactics_book.png", ["Tu pioches ", frenchNumber(draw), " ", CARTE, " de plus à chaque round."], draw)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.draw
    }
}

export const TACTICS_BOOK = new TacticsBook(TACTICS_DRAW)
