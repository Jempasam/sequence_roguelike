import type { Text } from "../../../../../../semantic"
import type { Card } from "../../Card"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"

/** What a card of the catalog holding cards is called, beyond what it holds. */
export interface CompositeLook {
    /** Its name, the names of its cards joined by default. */
    readonly name?: string

    /** Its rarity, the highest of its cards by default. */
    readonly rarity?: Rarity
}

/**
 * A card holding cards, which it plays in a way of its own: one after the other, at once, or one of them.
 * It takes one card of room in the chain, and its cards none.
 *
 * @remarks
 * One made during the run is a value of its own: two of the same cards are two values, alike in everything
 * but their identity, and a save writes it down as its cards. One of the catalog is named.
 */
export abstract class CompositeCard<T, U = undefined> extends AbstractCard<T, U> {


    public readonly contents: readonly Card[]

    /** Is it named, as a card of the catalog, rather than by its cards? */
    public readonly named: boolean

    /**
     * @param joiner - What its name puts between the names of its cards, when it has none of its own.
     */
    constructor(
        cards: readonly Card[], joiner: string,
        description: (cards: readonly Card[]) => Text, look: CompositeLook,
    ){
        const contents = [...cards]
        super(
            look.name ?? contents.map(each => each.name).join(joiner),
            description(contents),
            look.rarity ?? Rarity.highest(contents.map(each => each.rarity)),
        )
        this.contents = contents
        this.named = look.name !== undefined
    }
}

/** Is a card made of other cards, of any kind: a collage, a mélange or a draw between two? */
export function isComposite(card: Card): card is Card & { readonly contents: readonly Card[] } {
    return card instanceof CompositeCard
}

/**
 * The cards a composite is cut back into, one level down: one inside it stays whole.
 *
 * @throws {@link Error} When the card is not a composite.
 */
export function cut(card: Card): readonly Card[] {
    if(!isComposite(card)) throw new Error(`${card.name} is not made of cards: there is nothing to cut.`)
    return card.contents
}

/**
 * How many cards of the catalog a card is made of: one for a card holding none, and for one holding cards,
 * those of each of them.
 */
export function cardCount(card: Card): number {
    return card.contents ? card.contents.reduce((sum, each) => sum + cardCount(each), 0) : 1
}

/** The cards of the catalog a card holds, at every depth, in order: the card itself when it holds none. */
export function heldCards(card: Card): Card[] {
    return card.contents ? card.contents.flatMap(heldCards) : [card]
}
