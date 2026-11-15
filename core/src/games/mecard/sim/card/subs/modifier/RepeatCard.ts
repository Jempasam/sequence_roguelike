import { ModifierCard } from "../ModifierCard"
import { repeated } from "../tools/sequence"
import { Rarity } from "../../Rarity"

/** A card repeating the action a number of times, all in the step of the action. */
export class RepeatCard extends ModifierCard {


    constructor(
        /** How many times the action is played. */
        public readonly times: number,

        rarity: Rarity,
    ){
        super(`Répéter ×${times}`, `L'action est jouée ${times} fois, en une seule étape.`, rarity, action => repeated(action, times))
    }
}

export const REPEAT_2 = new RepeatCard(2, Rarity.RARE)
export const REPEAT_3 = new RepeatCard(3, Rarity.EPIC)
