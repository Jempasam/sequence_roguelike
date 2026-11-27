import { joinText } from "../../../../../../semantic"
import type { Text } from "../../../../../../semantic"
import type { Card } from "../../../card/Card"

import { FAMILY } from "./keyword"
import { marksOf } from "./marks"

/** Is a card of a family: does it name every one of its keywords, in one of its descriptions or another? */
export function isOfFamily(card: Card, ...marks: readonly object[]): boolean {
    const own = marksOf(card)
    return marks.every(mark => own.has(mark))
}

/** The cards of a family among some, in their order. */
export function ofFamily(cards: readonly Card[], ...marks: readonly object[]): Card[] {
    return cards.filter(card => isOfFamily(card, ...marks))
}

/** A family as a text names it, to spread after a card: `de famille dégâts physiques, force`. */
export function familyText(...marks: readonly Text[]): Text[] {
    return ["de ", FAMILY, " ", ...joinText(marks, ", ")]
}
