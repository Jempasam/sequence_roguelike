import type { Card } from "../../sim/card/Card"
import { FusionCard } from "../../sim/card/subs/composite/FusionCard"
import { MergedCard } from "../../sim/card/subs/composite/MergedCard"
import { RandomCard } from "../../sim/card/subs/composite/RandomCard"

/**
 * The character drawn over the limit between two cards held by a card, by the way it holds them: none for a
 * card holding none, or holding them in a way the interface does not tell.
 */
export function joinGlyph(card: Card): string {
    if(card instanceof FusionCard) return ">"
    if(card instanceof MergedCard) return "+"
    if(card instanceof RandomCard) return "?"
    return ""
}
