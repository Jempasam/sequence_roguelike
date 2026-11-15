import type { Text } from "../../../../semantic"

import type { Unit } from "../battle/Unit"

import type { CardType } from "./CardType"
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
    /** The card on its left, none at the start of the row. */
    readonly previous: Card|null

    /** The card on its right, as it stands when the card is rewritten, none at the end of the row. */
    readonly next: Card|null

    /** Every card on its right, as they stand when the card is rewritten, in order. */
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

    /** What it gives to the card on its left. */
    readonly output: CardType<T>

    /** What it takes from the card on its right, none for a card taking nothing. */
    readonly input: CardType<U>|null

    /** The cards it holds, in order, shown inside it, none for a card holding none. */
    readonly contents?: readonly Card[]

    /**
     * What the variants of a card with a parameter have in common, none for a card that stands alone. Cards
     * with the same group count as one when a unit may play it once per round: see {@link groupOf}.
     */
    readonly group?: object

    /**
     * The cards a player may choose in its place, itself among them, each named by what it chooses: a text,
     * whose kind tells a reader how to offer the choice. None for a card with nothing to choose, which is the
     * case of almost every card.
     *
     * @remarks
     * A card with variants is one value of a parameter: one card exists per value, all alike but for it, and
     * sharing a {@link Card.group}. It cannot be held by a composite, whose cards are played as written.
     */
    variants(): ReadonlyMap<Text, Card>

    /** The variant a unit would choose without choosing, the card itself by default. */
    variantFor(unit: Unit): Card

    /**
     * What it gives, from what the card on its right gives. It touches nothing: a preview calls it too.
     *
     * @param tree - The cards of the tree that gave the input, the card on its right first, none when it
     * takes nothing. Most cards care for what the input is, not for what gave it.
     */
    get(input: U, tree?: readonly Card[]): T

    /** Its name. */
    toString(): string

    /** Its name in the color of its rarity. */
    toSemString(): Text
}

/**
 * Can a card be held by a composite? Every card can but one with variants to choose from, whose value is
 * chosen when it is placed in the chain, which a card inside another never is.
 */
export function composable(card: Card): boolean {
    return card.variants().size === 0
}

/** What tells a card from the others a unit plays once per round: its group, or the card itself without one. */
export function groupOf(card: Card): object {
    return card.group ?? card
}

/**
 * Where in a hand a card of a chain comes from: the card itself, else the card of its family the hand holds,
 * which stands for every variant of it. -1 when the hand holds neither.
 */
export function handIndexOf(hand: readonly Card[], card: Card): number {
    const exact = hand.indexOf(card)
    if(exact >= 0 || card.variants().size === 0) return exact
    return hand.findIndex(each => each.variants().size > 0 && groupOf(each) === groupOf(card))
}

/**
 * Which cards of a chain a unit plays unlimited, in the order of the chain: the first card of each group
 * the unit plays unlimited does, the others come from its hand.
 */
export function playedUnlimited(cards: readonly Card[], unlimited: readonly Card[]): boolean[] {
    const used = new Set<object>()
    return cards.map(card => {
        const group = groupOf(card)
        if(!unlimited.includes(card) || used.has(group)) return false
        used.add(group)
        return true
    })
}

/** Does a card give values of a type? */
export function gives<T>(card: Card, type: CardType<T>): card is Card<T> {
    return card.output === type
}
