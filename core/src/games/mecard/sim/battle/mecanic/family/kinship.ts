import type { Text } from "../../../../../../semantic"
import type { Card } from "../../../card/Card"

import { KINSHIP } from "./keyword"
import { marksOf } from "./marks"

/** How many keywords two cards share, each counted once. */
export function sharedMarks(first: Card, second: Card): number {
    const others = marksOf(second)
    return [...marksOf(first)].filter(mark => others.has(mark)).length
}

/** Is a card akin to another: do they share at least a number of keywords? */
export function isKin(card: Card, reference: Card, shared: number): boolean {
    return sharedMarks(card, reference) >= shared
}

/** The cards akin to another among some, in their order. */
export function kinOf(cards: readonly Card[], reference: Card, shared: number): Card[] {
    return cards.filter(card => isKin(card, reference, shared))
}

/** A kinship as a text names it, to spread after a card: `de parenté 2`. */
export function kinText(shared: number): Text[] {
    return ["de ", KINSHIP, " ", shared]
}
