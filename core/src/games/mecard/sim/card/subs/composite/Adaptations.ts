import type { RewriteSpot } from "../../Card"
import { Rarity } from "../../Rarity"
import { CARTE } from "../../../base/keywords"

import { RewriteCard } from "./RewriteCards"

/**
 * Does what the card on the left takes agree with what the card on the right gives? A card on the left
 * taking nothing, or none at all, agrees with nothing, as does a card on the right giving nothing.
 */
function agrees({ previous, next }: RewriteSpot): boolean {
    const taken = previous?.input ?? null
    return taken !== null && next !== null && next.output === taken
}

/**
 * A card leaving the card on its right only when it fits the card on its left: what the one takes is what the
 * other gives. When they do not agree, the card on its right goes with it. It is rewritten before the
 * cards that take something are, so the card on its left is read as it is written.
 */
export const ADAPTATION = new RewriteCard("Adaptation", [
    "Fin de préparation : disparaît. Si ce que prend la ", CARTE, " qui la précède n'est pas ce que donne celle qui la suit, ",
    "celle qui la suit disparaît avec elle.",
], Rarity.RARE, (_ctx, spot) => {
    const goes = spot.next !== null && !agrees(spot)
    return { cards: [], consumed: goes ? 1 : 0, acting: false }
})

/** The same, going with the card on its left instead of the one on its right. */
export const REVERSED_ADAPTATION = new RewriteCard("Adaptation inversée", [
    "Fin de préparation : disparaît. Si ce que prend la ", CARTE, " qui la précède n'est pas ce que donne celle qui la suit, ",
    "celle qui la précède disparaît avec elle.",
], Rarity.RARE, (_ctx, spot) => {
    const goes = spot.previous !== null && !agrees(spot)
    return { cards: [], consumed: 0, acting: false, before: goes ? 1 : 0 }
})
