import { Color } from "../../../../engine/math"
import { Box, Label, NineSlice, Panel, Paragraph } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { Text } from "../../../../semantic"
import type { Card } from "../../sim/card/Card"
import { Heart } from "../../sim/heart/Heart"
import type { HeartKind } from "../../sim/heart/HeartKind"
import { ALL_CARDS } from "../../sim/catalog/cards"

import { ChainStrip } from "../hud/ChainStrip"
import type { ChainStripHost, StripCard } from "../hud/ChainStrip"
import { cardsOption } from "../hud/ChoiceOptions"
import { HeartView, heartsRow } from "../hud/HeartView"
import { typeColorOf } from "../look/colors"
import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"

/** What a block of the guide is built with. */
export interface GuideLook {
    readonly theme: Theme

    /** Hear that the pointer came over an object named in a text, or left it: the box explains it. */
    hearLink(link: object|null): void
}

/**
 * A part of the guide: it builds the component that shows it, each time the guide is laid out. A text, a
 * title, or anything that illustrates, such as cards: the guide only stacks what its blocks build.
 */
export type GuideBlock = (look: GuideLook) => Component

/** The space between a picture and its caption, in virtual pixels. */
const CAPTION_GAP = 2

/** The space between the lines of a list, and the margin of the notes, in virtual pixels. */
const LIST_GAP = 4

/** The color of the edge of the frame of an illustration. */
const FRAME_EDGE = new Color(0.88, 0.85, 0.96)

/** The card of the catalog with a name, which a guide that names a card that is gone cannot show. */
export function cardNamed(name: string): Card {
    const card = ALL_CARDS.find(each => each.name === name)
    if(!card) throw new Error(`The guide names the card "${name}", which the catalog does not have.`)
    return card
}

/** A title, to cut the guide in parts. */
export function heading(text: string): GuideBlock {
    return ({ theme }) => new Label(theme, text, { color: CHOSEN_TEXT })
}

/** A smaller title, to cut a part of the guide. */
export function subheading(text: string): GuideBlock {
    return ({ theme }) => new Label(theme, text, { color: DIM_TEXT })
}

/** A text over several lines, which may name objects and keywords: a pointer over one tells what it is. */
export function paragraph(text: Text): GuideBlock {
    return ({ theme, hearLink }) => new Paragraph(theme, text, { onLink: hearLink })
}

/** A text in a dimmer color, for a note. */
export function note(text: Text): GuideBlock {
    return ({ theme, hearLink }) => new Paragraph(theme, text, { color: DIM_TEXT, onLink: hearLink })
}

/** A text set apart in a frame, in the middle: what to remember. */
export function quote(text: Text): GuideBlock {
    return ({ theme, hearLink }) => {
        const panel = new Panel(theme, { padding: theme.panel.padding })
        panel.content = new Paragraph(theme, text, { color: CHOSEN_TEXT, align: "center", onLink: hearLink })
        return panel
    }
}

/** Cards in a row, in the frame an offer has, with a caption under them when there is one. */
export function cards(shown: readonly Card[], caption: Text|null = null): GuideBlock {
    return look => captioned(look, cardsOption(look.theme, shown, null), caption)
}

/** Hearts of a kind in a row, with a caption under them. */
export function hearts(kind: HeartKind, count: number, caption: Text|null = null): GuideBlock {
    return look => {
        const head = heartsRow(look.theme, Heart.many(kind, count), () => {})
        return captioned(look, cardsOption(look.theme, [], null, { head }), caption)
    }
}

/** A card of a chain, and what is plugged into it, as {@link chain} writes it. */
export function plug(card: Card, input: StripCard|null = null, active = true): StripCard {
    return {
        card, active, lit: false, crossed: false,
        inputs: card.input ? [input] : [],
        links: card.input && input ? [typeColorOf(card.input)] : [],
    }
}

/** A strip that does nothing when its cards are hovered or clicked: the guide reads the pointer itself. */
const STILL: ChainStripHost = {
    pick: () => {},
    hoverRoot: () => {},
    deckOf: () => null,
}

/** A chain of cards, its links shown, in a frame, with a caption under it. Each root comes after the last. */
export function chain(roots: readonly StripCard[], caption: Text|null = null): GuideBlock {
    return look => captioned(look, chainFrame(look.theme, roots), caption)
}

/** A chain, and the chain it becomes, with an arrow between. */
export function transform(
    before: readonly StripCard[], after: readonly StripCard[], caption: Text|null = null,
): GuideBlock {
    return look => {
        const row = new Box("row", { gap: LIST_GAP, align: "center" })
        row.add(chainFrame(look.theme, before))
        row.add(new Label(look.theme, "devient", { color: CHOSEN_TEXT }))
        row.add(chainFrame(look.theme, after))
        return captioned(look, row, caption)
    }
}

/** What is named in a list of the guide: a title, and what it says. */
export interface Term {
    /** What heads it: a name, or what builds a component such as hearts. */
    readonly head: string|((theme: Theme) => Component)

    readonly text: Text
}

/** A list of terms, each a title over a text, a space between. */
export function terms(list: readonly Term[]): GuideBlock {
    return ({ theme, hearLink }) => {
        const column = new Box("column", { gap: LIST_GAP, align: "stretch" })
        for(const { head, text } of list){
            const item = new Box("column", { align: "stretch" })
            item.add(typeof head === "string" ? new Label(theme, head, { color: CHOSEN_TEXT }) : head(theme))
            item.add(new Paragraph(theme, text, { onLink: hearLink }))
            column.add(item)
        }
        return column
    }
}

/** A heart of a kind and its name, as the head of a term. */
export function heartHead(theme: Theme, kind: HeartKind): Component {
    const row = new Box("row", { gap: LIST_GAP, align: "center" })
    row.add(new HeartView(theme, new Heart(kind)))
    row.add(new Label(theme, kind.name, { color: CHOSEN_TEXT }))
    return row
}

/** Anything else, built when the guide is laid out: a sketch, for instance. */
export function component(build: (look: GuideLook) => Component): GuideBlock {
    return look => build(look)
}

/** Several blocks one after the other, in a column, as one. */
export function together(...blocks: readonly GuideBlock[]): GuideBlock {
    return look => {
        const column = new Box("column", { gap: CAPTION_GAP, align: "stretch" })
        for(const block of blocks) column.add(block(look))
        return column
    }
}

/** A strip of cards in a frame like an offer's. */
function chainFrame(theme: Theme, roots: readonly StripCard[]): Component {
    const panel = new Panel(theme, { background: NineSlice.flat(theme.white, FRAME_EDGE), padding: 1 })
    const face = new Panel(theme, { padding: theme.panel.padding })
    face.content = new ChainStrip(theme, roots, "chain", STILL)
    panel.content = face
    return panel
}

/** A component centered over its caption. */
function captioned({ theme, hearLink }: GuideLook, shown: Component, caption: Text|null): Component {
    const column = new Box("column", { gap: CAPTION_GAP, align: "center" })
    column.add(shown)
    if(caption !== null) column.add(new Paragraph(theme, caption, { color: DIM_TEXT, align: "center", onLink: hearLink }), {
        align: "stretch",
    })
    return column
}
