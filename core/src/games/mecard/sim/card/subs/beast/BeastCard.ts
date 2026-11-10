import { joinText } from "../../../../../../semantic"
import type { Text } from "../../../../../../semantic"
import type { Card } from "../../Card"
import { BEAST } from "../../CardType"
import type { Beast, BeastHearts, BodyPart } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"

/** The cards of a list, told one after the other. */
export function cardsText(cards: readonly Card[]): Text[] {
    return joinText(cards, ", ")
}

/** The hearts of a body, told by group: `4 bleu, 1 rose`. */
function heartsText(hearts: readonly BeastHearts[]): Text[] {
    return joinText(hearts.map(({ kind, count }) => [count, " ", kind]), ", ")
}

/** The chain of a body, the places of its run and its bite told by their names. */
function bodyText(body: readonly BodyPart[]): Text[] {
    return joinText(body.map(part => part === "run" ? "course" : part === "bite" ? "morsure" : part), ", ")
}

/** A beast card: a spirit of nature, for a card using its run, its bite or its body. */
export class BeastCard extends AbstractCard<Beast> {


    public readonly output = BEAST
    public readonly input = null

    constructor(
        /** The beast it gives. */
        public readonly beast: Beast,
    ){
        super(beast.name, [
            ["Course : ", ...cardsText(beast.run), "."],
            ["Morsure : ", ...cardsText(beast.bite), "."],
            ["Corps : ", ...heartsText(beast.hearts), ". Joue ", ...bodyText(beast.body), "."],
        ], Rarity.COMMON)
    }


    public get(): Beast {
        return this.beast
    }
}
