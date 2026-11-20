import type { Card } from "../../sim/card/Card"
import type { Unit } from "../../sim/battle/Unit"

/** A card the next draw takes: from a deck, none when it cannot be known as it comes after a reshuffle. */
export interface Upcoming {
    readonly deck: number
    readonly card: Card|null
}

/** What the next draw of a unit gives. */
export interface DrawPreview {
    /** The cards it draws, in the order of the draw. */
    readonly drawn: readonly Upcoming[]

    /** How many cards it would draw with room enough in the hand. */
    readonly wanted: number
}

/**
 * Walk the draw of a unit without doing it: the decks in turn from the cursor, a deck with nothing left being
 * passed, the top of a pile first.
 */
function walk(unit: Unit, count: number): Upcoming[] {
    const { all, cursor } = unit.decks
    const taken = all.map(() => 0)
    const left = all.map(deck => deck.pile.length + deck.discard.length)
    const result: Upcoming[] = []
    let turn = cursor
    while(result.length < count && left.some(each => each > 0)){
        const index = turn % all.length
        turn = index + 1
        if(left[index] === 0) continue
        const { pile } = all[index]
        const place = pile.length - 1 - taken[index]
        // Past the pile, the discard is put back and shuffled: the card cannot be known.
        result.push({ deck: index, card: place >= 0 ? pile[place] : null })
        taken[index]++
        left[index]--
    }
    return result
}

/**
 * What a unit draws at the start of the next round, given how many cards its hand then holds: as many as it
 * draws, as the room of its hand and the cards left allow.
 */
export function previewDraw(unit: Unit, handSize: number): DrawPreview {
    const wanted = unit.stats.draw.value
    const room = Math.max(0, unit.stats.handSize.value - handSize)
    const all = walk(unit, wanted)
    return { drawn: all.slice(0, room), wanted: all.length }
}
