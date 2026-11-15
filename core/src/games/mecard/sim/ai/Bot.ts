import type { Unit } from "../battle/Unit"
import type { Card } from "../card/Card"
import { CardChain } from "../card/CardChain"

import type { UnitController, BattlePlan } from "./UnitController"

/**
 * The AI of the game, which plays the bots: the chain it plays is its hand read from left to right, a card
 * taking an input taking the card that follows it. `50 %, Attaque, Avancer` plays `50 %(Attaque) > Avancer`.
 *
 * @remarks
 * A bot does not think: its deck does. A mob deck is kept in order and tuned, its draw set to what it
 * plays each round, so it plays the same loop again and again, which the players learn to read. A card that
 * does not play once the hand is rewritten whole, whose slots the hand cannot fill, or that gives nothing
 * to play is left out of the chain, the others still playing: it waits for the next round, still in the hand.
 *
 * It reads nothing but the hand of the unit, so it is {@link UnitController.blind}: any other AI may ask it
 * what a unit does when it guesses what the others play.
 */
export class DeckAi implements UnitController {
    public readonly blind = true

    public decide(unit: Unit): BattlePlan {
        return { chain: deckChain(unit) }
    }
}

/**
 * The chain of the deck AI for a unit, from some of its cards in hand, all of them by default: read from
 * left to right, then its first card played unlimited, once, if the chain has room left.
 */
export function deckChain(unit: Unit, hand: readonly Card[] = unit.hand): CardChain {
    const chain = CardChain.leftToRight(hand, unit.stats.chainSize.value)
    // A unit that plays a card unlimited, a hero played by a bot, ends its chain with it, once.
    const [free] = unit.unlimited
    if(free && chain.size < unit.stats.chainSize.value) chain.cards.push(free)
    return chain
}
