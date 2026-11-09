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
    const chain = CardChain.leftToRight(unit.hand, unit.stats.chainSize.value)
    // A unit that plays a card unlimited, a hero played by a bot, ends its chain with it, once.
    const [free] = unit.unlimited
    if(free && chain.size < unit.stats.chainSize.value) chain.cards.push(free)
    return chain
}
