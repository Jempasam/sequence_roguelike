import type { Action } from "../../../battle/Action"

import { ModifierCard } from "../ModifierCard"
import { Rarity } from "../../Rarity"

/** A card repeating the actions a number of times, each a step of its own. */
export class RepeatCard extends ModifierCard {


    constructor(
        /** How many times the actions are played. */
        public readonly times: number,

        rarity: Rarity,
    ){
        super(`Répéter ×${times}`, `L'action est jouée ${times} fois, une étape chacune.`, rarity, actions => {
            const repeated: Action[] = []
            for(let i = 0; i < times; i++) repeated.push(...actions)
            return repeated
        })
    }
}

export const REPEAT_2 = new RepeatCard(2, Rarity.RARE)
export const REPEAT_3 = new RepeatCard(3, Rarity.EPIC)
