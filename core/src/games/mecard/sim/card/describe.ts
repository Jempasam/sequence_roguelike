import { keywordsIn } from "../../../../semantic"
import type { Keyword } from "../../../../semantic"
import { CARTE } from "../base/keywords"

import type { Card } from "./Card"

/** The descriptions a card tells: its own, and for a card holding cards, theirs, at every depth. */
export function descriptionsOf(card: Card): Card["description"][] {
    return [card.description, ...(card.contents ?? []).flatMap(descriptionsOf)]
}

/**
 * The notions a card names, in its description or those of the cards it holds: a hint of what it does, for the
 * analysis of the decks. The rules of the families read every keyword instead. {@link CARTE} is left out,
 * which nearly every card names.
 */
export function keywordsOf(card: Card): Set<Keyword> {
    const found = new Set(descriptionsOf(card).flatMap(keywordsIn))
    found.delete(CARTE)
    return found
}
