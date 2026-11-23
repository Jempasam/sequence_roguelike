import { Color } from "../../../../engine/math"
import { Box, Image, NineSlice, OverflowContainer, Panel, Paragraph } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { Text } from "../../../../semantic"
import type { Visual } from "../../sim/base/Visual"
import type { Card } from "../../sim/card/Card"

import type { UnitSprites } from "../look/UnitSprites"
import { CARD_LOOKS, CardView } from "./CardView"

/** How wide an option showing cards or a text is at least, in virtual pixels. */
const OPTION_WIDTH = 120

/** The space between two cards of an option, in virtual pixels. */
const CARD_GAP = 2

/** How far each card of an overlapped option overflows the next: a third of a card, whatever the room. */
export const CARD_OVERLAP = Math.floor(CARD_LOOKS.hand.width / 2)

/** The edge of an option, light so the option stands out, and its face, lighter than the panels. */
const OPTION_EDGE = new Color(0.88, 0.8, 0.62)
const OPTION_FACE = new Color(0.22, 0.13, 0.07)

/** What an option shows besides its cards and its text. */
export interface OptionExtras {
    /** What it shows above its cards, nothing when none. */
    readonly head?: Component|null

    /** What it shows under its cards, nothing when none. */
    readonly under?: Component|null

    /** What it shows in a row before its cards, such as boosters, nothing when none. */
    readonly before?: readonly Component[]

    /** The place of the deck its cards come from, which colors them, none for cards of no deck. */
    readonly deck?: number|null

    /** How the sprite shown left of the text looks, nothing when none. */
    readonly sprite?: Visual
    readonly sprites?: UnitSprites

    /** How wide it is at least, in virtual pixels: 120 when none. */
    readonly least?: number

    /** How many cards at most lie in a row, the others going on rows under it. All in one row when none. */
    readonly perRow?: number

    /** Do its cards overlap by {@link CARD_OVERLAP}, as those of an ally offered do, rather than lie apart? */
    readonly overlapped?: boolean
}

/**
 * Something offered in a choice: its cards in a row, its text under them when it has one, in a frame at
 * least {@link OPTION_WIDTH} wide, the text wrapped to it.
 */
export function cardsOption(
    theme: Theme, cards: readonly Card[], text: Text|null, extras: OptionExtras = {},
): Component {
    const column = new Box("column", { gap: 2, align: "center" })
    if(extras.head) column.add(extras.head)
    if(extras.before?.length){
        const row = new Box("row", { gap: CARD_GAP, align: "start" })
        for(const piece of extras.before) row.add(piece)
        column.add(row)
    }
    if(cards.length > 0){
        const perRow = Math.max(1, extras.perRow ?? cards.length)
        const rows = new Box("column", { gap: CARD_GAP, align: "center" })
        for(let first = 0; first < cards.length; first += perRow){
            const row = extras.overlapped
                ? new OverflowContainer({ minOverflow: CARD_OVERLAP, maxOverflow: CARD_OVERLAP })
                : new Box("row", { gap: CARD_GAP, align: "start" })
            for(const card of cards.slice(first, first + perRow)){
                const view = new CardView(theme, card, "hand")
                view.deck = extras.deck ?? null
                row.add(view)
            }
            rows.add(row)
        }
        column.add(rows)
    }
    if(extras.under) column.add(extras.under)
    if(text !== null){
        const paragraph = new Paragraph(theme, text)
        const { sprites, sprite } = extras
        const picture = sprites && sprite ? sprites.of(sprite) : null
        column.add(picture ? pictured(theme, new Image(picture), paragraph) : paragraph, { align: "stretch" })
    }
    return framed(theme, column, extras.least ?? OPTION_WIDTH)
}

/**
 * A wrapping paragraph with a sprite on its left, at the size it needs in an option of the least width: a
 * row measures its children unwrapped, so it would be too low for the lines the paragraph wraps to.
 */
function pictured(theme: Theme, image: Component, paragraph: Paragraph): Component {
    const gap = 2
    const imageSize = image.measure(Infinity)
    const margin = 2 * theme.panel.padding + 2
    const width = Math.max(
        OPTION_WIDTH - margin, imageSize.preferredWidth + gap + paragraph.measure(Infinity).minWidth,
    )
    const room = width - imageSize.preferredWidth - gap
    const height = Math.max(imageSize.preferredHeight, paragraph.measure(room).preferredHeight)
    const row = new Box("row", { gap, align: "center" })
    row.add(image)
    row.add(paragraph, { grow: 1 })
    row.fixedSize = { width, height }
    return row
}

/**
 * A frame around a content, an edge around a face lighter than the panels, of a width or wider when the
 * content needs it, since an option is posed and so never cut, as tall as the content needs at that width.
 */
function framed(theme: Theme, content: Component, least: number): Component {
    const padding = theme.panel.padding
    const margin = 2 * padding + 2
    const width = Math.max(least, content.measure(Infinity).minWidth + margin)
    const face = new Panel(theme, { background: NineSlice.flat(theme.white, OPTION_FACE), padding })
    face.content = content
    const edge = new Panel(theme, { background: NineSlice.flat(theme.white, OPTION_EDGE), padding: 1 })
    edge.content = face
    const height = content.measure(width - margin).preferredHeight + margin
    edge.fixedSize = { width, height }
    return edge
}
