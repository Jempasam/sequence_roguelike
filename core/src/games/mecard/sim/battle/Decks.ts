import type { Attribute } from "../base/Attribute"
import type { Rng } from "../base/Rng"
import type { Card } from "../card/Card"

import { Deck } from "./Deck"

/** A card drawn from the decks of a unit. */
export interface DeckDraw {
    readonly card: Card

    /** The deck it came from, by its place among the decks. */
    readonly deck: number

    /** Was the discard of its deck put back to draw it? */
    readonly recycled: boolean
}

/**
 * The decks of a unit, none or several, drawn from in turn, from the first to the last. Each has its own
 * discard: a card goes back to the deck it was drawn from.
 *
 * @remarks
 * A card is an object shared by its copies, so where one came from cannot be written on it. Each card keeps
 * instead the decks its copies out of the decks came from: copies being alike, it does not matter which
 * goes back where, each deck gets back as many as it gave.
 */
export class Decks {


    /** Each deck, in the order they are drawn from. */
    public readonly all: readonly Deck[]

    /** The deck to draw from next, by its place among the decks, a deck with nothing to draw being passed. */
    public cursor = 0

    /**
     * @param lists - The cards of each deck, the first to draw first.
     * @param ordered - Are the decks kept in order? Read at each refill, so an item may change it.
     */
    constructor(lists: readonly (readonly Card[])[], rng: Rng, ordered: Attribute<boolean>){
        this.all = lists.map(cards => new Deck(cards, rng, ordered))
    }


    /** The cards of every draw pile. */
    public get piles(): Card[] {
        return this.all.flatMap(deck => deck.pile)
    }

    /** The cards of every discard. */
    public get discards(): Card[] {
        return this.all.flatMap(deck => deck.discard)
    }

    /** The cards out of the decks, each with the deck it goes back to. */
    public get homes(): [Card, number][] {
        return [...this.#homes].flatMap(([card, decks]) => decks.map((deck): [Card, number] => [card, deck]))
    }

    /**
     * What tells the deck each card out of the decks goes back to, none for a card from elsewhere: asked
     * again for the same card, it goes through its copies, which are one card from several decks.
     */
    public homeTeller(): (card: Card) => number|null {
        const left = new Map([...this.#homes].map(([card, decks]) => [card, [...decks]]))
        return card => left.get(card)?.shift() ?? null
    }

    /** The next card, from the next deck with one, none when every deck is exhausted. */
    public draw(rng: Rng): DeckDraw|null {
        const count = this.all.length
        for(let tried = 0; tried < count; tried++){
            const index = (this.cursor + tried) % count
            const deck = this.all[index]
            const recycled = deck.pile.length === 0 && deck.discard.length > 0
            const card = deck.draw(rng)
            if(!card) continue
            this.cursor = (index + 1) % count
            this.remember(card, index)
            return { card, deck: index, recycled }
        }
        return null
    }

    /**
     * Take a card out of a draw pile, at a place of it, without drawing: the turn of the decks does not move.
     *
     * @throws {@link Error} When the pile holds no card there.
     */
    public take(index: number, place: number): Card {
        const [card] = this.all[index].pile.splice(place, 1)
        if(!card) throw new Error(`The deck ${index} holds no card at ${place}.`)
        this.remember(card, index)
        return card
    }

    /** Note that a card out of the decks goes back to a deck. */
    public remember(card: Card, deck: number): void {
        const homes = this.#homes.get(card)
        if(homes) homes.push(deck)
        else this.#homes.set(card, [deck])
    }

    /**
     * Put a card in the discard of the deck it came from, or of the first deck for a card from elsewhere.
     *
     * @returns The deck it went to, none when there is no deck: the card is lost.
     */
    public discard(card: Card): number|null {
        const homes = this.#homes.get(card)
        const home = homes?.pop() ?? 0
        if(homes?.length === 0) this.#homes.delete(card)
        const deck = this.all.at(home)
        if(!deck) return null
        deck.discard.push(card)
        return home
    }

    /** Put each discard back under its pile. */
    public recycle(rng: Rng): void {
        for(const deck of this.all) deck.recycle(rng)
    }


    readonly #homes = new Map<Card, number[]>()
}
