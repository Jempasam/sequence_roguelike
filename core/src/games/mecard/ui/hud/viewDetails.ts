import type { Component } from "../../../../engine/ui"

import { AbsItemIcon } from "./AbsItemIcon"
import { CardView } from "./CardView"
import { cardDetail } from "./cardDetail"
import { DeckPile } from "./DeckPile"
import type { Detail, DetailText } from "./Detail"
import { detailsOfParts } from "./detailParts"
import { HeartView, heartText } from "./HeartView"

/**
 * What a view of the game tells while the pointer is over it: the text of a card, with the cards it holds
 * apart, of a heart, and of an icon or a pile that was given one, none for anything else.
 */
export function viewDetailOf(part: Component): DetailText|Detail|null {
    if(part instanceof CardView) return part.card ? cardDetail(part) : null
    if(part instanceof HeartView) return heartText(part.heart)
    if(part instanceof AbsItemIcon || part instanceof DeckPile) return part.detail
    return null
}

/**
 * The details of every card, heart, icon and pile found in a component, going down into it.
 *
 * @param skipped - The parts to leave out, with what they hold.
 */
export function viewDetails(root: Component, skipped: ReadonlySet<Component> = new Set()): Detail[] {
    return detailsOfParts(root, viewDetailOf, skipped)
}
