import type { Attribute } from "../base/Attribute"
import type { Rng } from "../base/Rng"
import type { Card } from "../card/Card"

/** The draw pile and the discard pile of a unit. Its hand lives on the unit. */
export class Deck {


    /** The cards to draw, the next one last. */
    public readonly pile: Card[]

    /** The cards played, in the order they were played, back into the pile once it runs out. */
    public readonly discard: Card[] = []

    /**
     * @param cards - The cards, the first to draw first.
     * @param ordered - Is the deck kept in order? Read at each refill, so an item may change it.
     */
    constructor(cards: readonly Card[], rng: Rng, ordered: Attribute<boolean>){
        this.#ordered = ordered
        // Reversed, since the next card is the last of the pile.
        this.pile = [...cards].reverse()
        if(!ordered.value) rng.shuffle(this.pile)
    }


    /** Is there nothing left to draw, even after putting the discard back? */
    public get exhausted(): boolean {
        return this.pile.length === 0 && this.discard.length === 0
    }

    /**
     * The next card, none when both piles are empty. An empty pile is refilled from the discard first:
     * shuffled, or for an ordered deck reversed, so the first card played is the first drawn again.
     */
    public draw(rng: Rng): Card|null {
        if(this.pile.length === 0) this.recycle(rng)
        return this.pile.pop() ?? null
    }

    /**
     * Put the discard back under the pile: then shuffled with it, or for an ordered deck kept in the order
     * played, drawn after what the pile holds.
     */
    public recycle(rng: Rng): void {
        this.pile.unshift(...this.discard.reverse())
        this.discard.length = 0
        if(!this.#ordered.value) rng.shuffle(this.pile)
    }


    readonly #ordered: Attribute<boolean>
}
