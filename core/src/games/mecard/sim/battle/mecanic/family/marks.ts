import { notionsIn } from "../../../../../../semantic"
import type { Card } from "../../../card/Card"
import { descriptionsOf } from "../../../card/describe"

/**
 * The keywords of a card, as a player calls them: everything its description names, and those of the cards it
 * holds, at every depth. A notion counts whatever way it is written, anything else by reference.
 */
export function marksOf(card: Card): Set<object> {
    return new Set(descriptionsOf(card).flatMap(text => [...notionsIn(text)]))
}
