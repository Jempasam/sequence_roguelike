import { composable } from "../../Card"
import type { Card } from "../../Card"
import { Rarity } from "../../Rarity"
import { CARTE, FUSION, MERGE } from "../../../base/keywords"

import { FusionCard } from "./FusionCard"
import { mergeable, MergedCard } from "./MergedCard"
import { RewriteCard } from "./RewriteCards"

/** The cards on the right of a spot from its start, as long as they may all be merged together. */
function mergeableRun(rest: readonly Card[]): readonly Card[] {
    let end = 0
    while(end < rest.length && mergeable(rest.slice(0, end + 1))) end++
    return rest.slice(0, end)
}

/**
 * One card standing for cards in order: a collage of them, the card itself when alone. A card with variants
 * to choose from cannot be held by a collage, and is left out.
 *
 * @returns None when no card is left.
 */
export function collageOf(cards: readonly Card[]): Card|null {
    const held = cards.filter(composable)
    if(held.length === 0) return null
    return held.length === 1 ? held[0] : new FusionCard(held)
}

/**
 * The longest row of actions on its right that may be merged into one, played at once: the merge lasts
 * the round, the cards it took go to the discard.
 */
export const TIME_MANIPULATION = new RewriteCard("Manipulation temporelle", [
    "Fin de préparation : la plus longue suite d'actions qui la suit et qui peuvent se mélanger (celles qui prennent quelque chose prennent toutes la même chose) devient un seul ",
    MERGE.as("mélange"), ", joué en une étape.",
], Rarity.EPIC, (_ctx, spot) => {
    const run = mergeableRun(spot.rest)
    if(run.length < 2) return { cards: [], consumed: 0, acting: false }
    return { cards: [new MergedCard(run)], consumed: run.length, acting: false }
})

/**
 * The whole chain on its right taken out, and given back in the hand as one fleeting collage, in order: it
 * plays on a later round, all of it for one card of room.
 */
export const PREPARATION_CARD = new RewriteCard("Préparation", [
    "Fin de préparation : retire toute la chaîne qui la suit, et met dans ta main un ", FUSION.as("collage"),
    " temporaire de ces ", CARTE.as("cartes"), ", dans l'ordre. Une fois jouée, elle disparaît.",
], Rarity.EPIC, (_ctx, spot) => {
    const { rest } = spot
    return { cards: [], consumed: rest.length, acting: rest.length > 0 }
}, ({ battle, unit, spot }) => {
    const collage = collageOf(spot.rest)
    if(collage) battle.giveFleetingCard(unit, collage)
})
