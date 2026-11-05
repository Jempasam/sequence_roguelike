import { PrepCard } from "../PrepCard"
import { Rarity } from "../../Rarity"
import { CARTE } from "../../../base/keywords"

/** How many cards the draw of the catalog draws. */
const DRAW_COUNT = 2

/** Cards drawn when the preparation ends, for the rounds after. */
export class DrawCard extends PrepCard {


    constructor(
        /** How many cards it draws. */
        public readonly count: number,
    ){
        super(
            "Pioche", ["Fin de préparation : pioche ", count, " ", CARTE.as("cartes"), ", dans la limite de ta main."], Rarity.COMMON,
            ({ battle, unit }) => {
                battle.drawCards(unit, count)
            },
        )
    }
}

export const DRAW = new DrawCard(DRAW_COUNT)
