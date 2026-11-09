import { Box, Paragraph } from "../../../../engine/ui"
import type { Component, ParagraphOptions, Theme } from "../../../../engine/ui"
import type { Text } from "../../../../semantic"
import type { Card } from "../../sim/card/Card"
import { cardText } from "../../sim/halt/subs/shown"

import { CardView } from "./CardView"
import type { CardPlace } from "./CardView"

/** The space between two cards, and between the name and the cards, in virtual pixels. */
const CARD_GAP = 2

/**
 * What can be done with a card of a deck offered: what it shows of being picked, none when it is not, an
 * empty text for a card picked once, a count for one that may be picked several times, and picking it.
 */
export interface DeckPick {
    readonly activation: string|null
    readonly pick: () => void
}

/** How a deck is shown. */
export interface DeckViewOptions {
    /** How wide its rows of cards may be, in virtual pixels. */
    readonly room: number

    /** The size of its cards. */
    readonly size: CardPlace

    /** What it is called, above its cards, nothing when none. */
    readonly name?: Text|null

    /** How its name is written. */
    readonly nameLook?: ParagraphOptions

    /** Its place among the decks of its character, which colors its cards, none for cards of no deck. */
    readonly deck?: number|null

    /** Tell what a card hovered is, and that the pointer left it. */
    readonly tell?: (text: Text|null) => void

    /**
     * What can be done with a card, when its cards are offered: a card it gives nothing for is shown dim,
     * and does nothing. Its cards are only shown when none.
     */
    readonly pickable?: (card: Card, index: number) => DeckPick|null
}

/**
 * A deck with what it holds: its name, then its cards in rows as wide as a room lets them, in the color of
 * the deck, each told on hover. Its cards can be offered to pick some.
 */
export class DeckView extends Box {


    constructor(
        public readonly theme: Theme,

        /** The cards shown, in their order. */
        public readonly cards: readonly Card[],

        options: DeckViewOptions,
    ){
        super("column", { gap: CARD_GAP })
        if(options.name) this.add(new Paragraph(theme, options.name, options.nameLook ?? {}))
        this.#addRows(cards.map((card, index) => this.#view(card, index, options)), options.room)
    }


    /** A card of the deck, as its options want it. */
    #view(card: Card, index: number, options: DeckViewOptions): CardView {
        const { pickable, tell } = options
        const choice = pickable?.(card, index) ?? null
        const view = new CardView(this.theme, card, options.size)
        view.activation = choice?.activation ?? null
        view.deck = options.deck ?? null
        if(tell) view.onHover = over => tell(over ? cardText(card) : null)
        if(choice) view.onPick = choice.pick
        if(pickable) view.dimmed = !choice
        return view
    }

    /** Add components in rows as wide as a room lets them. */
    #addRows(views: readonly Component[], room: number): void {
        let row = new Box("row", { gap: CARD_GAP, align: "start" })
        let used = 0
        for(const view of views){
            const width = view.measure(Infinity).preferredWidth
            if(used > 0 && used + width > room){
                this.add(row)
                row = new Box("row", { gap: CARD_GAP, align: "start" })
                used = 0
            }
            row.add(view)
            used += width + CARD_GAP
        }
        this.add(row)
    }
}
