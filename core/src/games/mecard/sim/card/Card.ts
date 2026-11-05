import type { Text } from "../../../../semantic"

import type { CardType } from "./CardType"
import type { Family } from "./Family"
import type { Rarity } from "./Rarity"

/** What a card rewriting the chain is rewritten with: the chance it may draw. */
export interface RewriteContext {
    /**
     * One of options, drawn at random: from the battle when the preparation ends, the first one in a
     * preview, which then knows it guessed.
     */
    pick<T>(options: readonly T[]): T
}

/** Where a card is rewritten: what lies around it in the row, and what its unit holds. */
export interface RewriteSpot {
    /** The card on its right, itself already rewritten, none at the end of the row. */
    readonly next: Card|null

    /** Every card on its right, already rewritten, in order. */
    readonly rest: readonly Card[]

    /** The cards in sight of the unit playing it: its hand, its discard and its chain, not its draw pile. */
    readonly deck: readonly Card[]

    /**
     * Is the chain a copy, rewritten to try a card in the place of another? A card drawing from others then
     * draws nothing, so a trial never tries in turn.
     */
    readonly trial: boolean

    /**
     * Would a card play in its place, once the whole chain is rewritten? Tried on a copy of the chain, every
     * chance taken as its first option.
     */
    fits(card: Card): boolean
}

/**
 * A card: a typed function from what the card on its right gives to what it gives to the card on its left,
 * or to the queue when nothing on its left takes it.
 *
 * @remarks
 * A card is a description, shared by every copy of it in every deck: it holds no state. The copies in a
 * deck are the same object several times. What it gives is an object of its output type, which the game
 * calls: actions are played, a preparation rewrites the chain at the end of the preparation.
 */
export interface Card<T = unknown, U = unknown> {
    readonly name: string

    /** What it does, in a sentence or two, for the player: its numbers and the cards it names told. */
    readonly description: Text

    readonly rarity: Rarity

    /** What the player reads it as: its color and the word at its foot. */
    readonly family: Family

    /** What it gives to the card on its left. */
    readonly output: CardType<T>

    /** What it takes from the card on its right, none for a card taking nothing. */
    readonly input: CardType<U>|null

    /** The cards it holds, in order, shown inside it, none for a card holding none. */
    readonly contents?: readonly Card[]

    /** What it gives, from what the card on its right gives. It touches nothing: a preview calls it too. */
    get(input: U): T

    /** Its name. */
    toString(): string

    /** Its name in the color of its rarity. */
    toSemString(): Text
}

/** Does a card give values of a type? */
export function gives<T>(card: Card, type: CardType<T>): card is Card<T> {
    return card.output === type
}
