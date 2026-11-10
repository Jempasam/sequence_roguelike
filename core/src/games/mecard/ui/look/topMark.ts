import type { Card } from "../../sim/card/Card"
import { phaseOf } from "../../sim/card/CardChain"
import type { PrepPhase } from "../../sim/card/CardType"

/** The arrow telling when a preparation is rewritten: the way it reads the cards around it. */
const ARROWS: Readonly<Record<PrepPhase, string>> = { prepfull: "→", prepless: "←" }

/** The marks found already: a card holds no state, so its mark never changes. */
const marks = new WeakMap<Card, string>()

/**
 * The mark drawn in black on the band of a card: an arrow for a preparation, to the right when it is
 * rewritten from left to right, to the left when it is from right to left, none for any other card.
 */
export function topMark(card: Card): string {
    let mark = marks.get(card)
    if(mark === undefined){
        const phase = phaseOf(card)
        mark = phase ? ARROWS[phase] : ""
        marks.set(card, mark)
    }
    return mark
}
