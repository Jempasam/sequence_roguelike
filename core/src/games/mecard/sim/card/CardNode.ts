import { joinText } from "../../../../semantic"
import type { Text } from "../../../../semantic"

import type { Card } from "./Card"

/**
 * A card of a chain as it reads, with the card it takes in its slot: a tree whose root is a head of the
 * chain. It is read from the chain, never put together by hand: a chain is a row of cards, each taking
 * the card on its right.
 */
export class CardNode {


    /** What fills its slot, none for an empty one, nothing for a card taking nothing. */
    public readonly inputs: readonly (CardNode|null)[]

    constructor(
        public readonly card: Card,

        /** What fills its slot, none when it is empty. */
        input: CardNode|null = null,

        /** Where the card stands in the row of the chain. */
        public readonly index = 0,

        /** Is it played, rather than greyed out: its slot filled, under a head that plays? */
        public readonly active = true,
    ){
        if(input && !card.input) throw new Error(`${card.name} takes no input.`)
        this.inputs = card.input ? [input] : []
    }


    /** How many cards the tree holds, itself included: the cards it spans in the row. */
    public get size(): number {
        let size = 1
        for(const input of this.inputs) if(input) size += input.size
        return size
    }

    /** The cards of the tree, in the order of the row. */
    public get cards(): Card[] {
        const cards = [this.card]
        for(const input of this.inputs) if(input) cards.push(...input.cards)
        return cards
    }

    /** Is every slot of the tree filled? */
    public get complete(): boolean {
        return this.inputs.every(input => input !== null && input.complete)
    }

    /** Can a card be plugged into a slot of this node: is the slot empty, and of the type the card gives? */
    public accepts(slot: number, card: Card): boolean {
        return this.inputs[slot] === null && this.card.input === card.output
    }

    /** The tree on one line, an empty slot as `_`: `Sort(_)`. */
    public toString(): string {
        if(this.inputs.length === 0) return this.card.name
        return `${this.card.name}(${this.inputs.map(input => input?.toString() ?? "_").join(", ")})`
    }

    /** The same, each card in the color of its rarity. */
    public toSemString(): Text {
        if(this.inputs.length === 0) return this.card
        return [this.card, "(", ...joinText(this.inputs.map(input => input ?? "_"), ", "), ")"]
    }
}
