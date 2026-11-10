import { keywordsIn, mentions } from "../../../../semantic"
import type { Keyword } from "../../../../semantic"
import { CARTE } from "../base/keywords"

import type { Card } from "./Card"

/** The descriptions a card tells: its own, and for a card holding cards, theirs, at every depth. */
function descriptionsOf(card: Card): Card["description"][] {
    return [card.description, ...(card.contents ?? []).flatMap(descriptionsOf)]
}

/** Does a card name every one of some parts in what it tells: its description, or those of the cards it holds? */
export function cardMentions(card: Card, ...parts: readonly object[]): boolean {
    const descriptions = descriptionsOf(card)
    return parts.every(part => descriptions.some(text => mentions(text, part)))
}

/**
 * The notions a card names, in its description or those of the cards it holds: what tells a card of a family.
 * {@link CARTE} is left out, which nearly every card names.
 */
export function keywordsOf(card: Card): Set<Keyword> {
    const found = new Set(descriptionsOf(card).flatMap(keywordsIn))
    found.delete(CARTE)
    return found
}
