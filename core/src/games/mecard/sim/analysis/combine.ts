import type { BeastHearts } from "../card/CardType"

import { orderedAnatomy, unorderedAnatomy } from "./Anatomy"
import type { Anatomy } from "./Anatomy"

/** The hearts of several sources added up, kind by kind, in the order the kinds are first met. */
function summed(anatomies: readonly Anatomy[]): BeastHearts[] {
    const counts = new Map<BeastHearts["kind"], number>()
    for(const { kind, count } of anatomies.flatMap(anatomy => anatomy.hearts)){
        counts.set(kind, (counts.get(kind) ?? 0) + count)
    }
    return [...counts].map(([kind, count]) => ({ kind, count }))
}

/**
 * Several sources as one: named after all of them, `A-B`, with the hearts added up, the look of the first
 * that has one, the cards it plays as often as it wishes put together. Their cards are in order, one source
 * after the other, when all of them are; else they are a set.
 */
export function combineAnatomies(anatomies: readonly Anatomy[]): Anatomy {
    if(anatomies.length === 1) return anatomies[0]
    const name = anatomies.map(anatomy => anatomy.name).join("-")
    const more = {
        sprite: anatomies.find(anatomy => anatomy.sprite !== null)?.sprite ?? null,
        hearts: summed(anatomies),
        unlimited: [...new Set(anatomies.flatMap(anatomy => anatomy.unlimited))],
    }
    const ordered = anatomies.flatMap(anatomy => anatomy.ordered ? [anatomy] : [])
    if(ordered.length === anatomies.length){
        return orderedAnatomy(name, ordered.flatMap(anatomy => anatomy.chain), more)
    }
    const parts = anatomies.flatMap(anatomy => anatomy.ordered ? anatomy.chain : anatomy.parts)
    return unorderedAnatomy(name, parts, more)
}
