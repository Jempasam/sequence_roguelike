import type { Unit } from "../battle/Unit"
import { CardChain } from "../card/CardChain"

/**
 * The chain a bot plays: its hand read from left to right, a card taking an input taking the card that
 * follows it. `50 %, Attaque, Avancer` plays `50 %(Attaque) > Avancer`.
 *
 * @remarks
 * A bot does not think: its deck does. A mob deck is kept in order and tuned, its draw set to what it
 * plays each round, so it plays the same loop again and again, which the players learn to read. The
 * reading stops at the first card that does not play once the hand is rewritten whole, whose slots the
 * hand cannot fill, or that gives nothing to play: the cards left wait for the next round, still first in
 * the hand.
 */
export function planFor(unit: Unit): CardChain {
    return CardChain.leftToRight(unit.hand, unit.stats.chainSize.value)
}
