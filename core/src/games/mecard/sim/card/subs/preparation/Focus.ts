import type { UnitContext } from "../../../battle/Action"
import { damage } from "../../../battle/words"
import { Strength } from "../../../process/subs/Strength"

import { PrepCard } from "../PrepCard"
import { Rarity } from "../../Rarity"

/** How many hearts the focus of the catalog adds to each attack, for its round. */
const FOCUS_BONUS = 1

/** A bonus to the attacks of the round: a process of strength, started at the end of the preparation. */
export class FocusCard extends PrepCard {


    constructor(
        /** How many hearts it adds to each attack, for its round. */
        public readonly bonus: number,
    ){
        super(
            "Concentration", ["Fin de préparation : +", damage(bonus, "physical"), " à tes coups ce round."], Rarity.RARE,
            FocusCard.#focusing(bonus),
        )
    }


    static #focusing(bonus: number): (ctx: UnitContext) => void {
        return ({ battle, unit }) => battle.startProcess(unit, new Strength(bonus))
    }
}

export const FOCUS = new FocusCard(FOCUS_BONUS)
