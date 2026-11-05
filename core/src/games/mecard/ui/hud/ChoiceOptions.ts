import { Color } from "../../../../engine/math"
import { Box, Label, NineSlice, Panel, Paragraph } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { Text } from "../../../../semantic"
import type { Card } from "../../sim/card/Card"
import { allCards } from "../../sim/run/Hero"
import type { Hero } from "../../sim/run/Hero"

import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"
import { CardView } from "./CardView"
import { heartsRow } from "./HeartView"
import { withPicture } from "./UnitPicture"

/** How wide an option showing cards or a text is at least, in virtual pixels. */
const OPTION_WIDTH = 120

/** How wide a character offered is, in virtual pixels. */
const HERO_WIDTH = 84

/** The space between two cards of an option, in virtual pixels. */
const CARD_GAP = 2

/** The edge of an option, light so the option stands out, and its face, lighter than the panels. */
const OPTION_EDGE = new Color(0.88, 0.85, 0.96)
const OPTION_FACE = new Color(0.17, 0.15, 0.25)

/** What an option shows besides its cards and its text. */
export interface OptionExtras {
    /** What it shows above its cards, nothing when none. */
    readonly head?: Component|null

    /** What it shows under its cards, nothing when none. */
    readonly under?: Component|null

    /** The place of the deck its cards come from, which colors them, none for cards of no deck. */
    readonly deck?: number|null
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
    if(cards.length > 0){
        const row = new Box("row", { gap: CARD_GAP, align: "start" })
        for(const card of cards){
            const view = new CardView(theme, card, "hand")
            view.deck = extras.deck ?? null
            row.add(view)
        }
        column.add(row)
    }
    if(extras.under) column.add(extras.under)
    if(text !== null) column.add(new Paragraph(theme, text), { align: "stretch" })
    return framed(theme, column, OPTION_WIDTH)
}

/** Who a character offered is, on one row, to head its option: its sprite, its name and its hearts. */
export function unitHead(theme: Theme, unit: Hero, sprites: UnitSprites): Component {
    const row = new Box("row", { gap: 4, align: "center" })
    row.add(new Label(theme, unit.name, { color: CHOSEN_TEXT }))
    row.add(heartsRow(theme, unit.hearts, () => {}))
    return withPicture(sprites, unit.sprite, row)
}

/** A character of the party offered in a choice: its sprite, then its name, its hearts and its deck. */
export function heroOption(theme: Theme, hero: Hero, sprites: UnitSprites): Component {
    const column = new Box("column", { gap: 2, align: "center" })
    column.add(new Label(theme, hero.name, { color: CHOSEN_TEXT }))
    column.add(heartsRow(theme, hero.hearts, () => {}))
    const bot = hero.controller === "bot" ? " · bot" : ""
    column.add(new Label(theme, `${allCards(hero).length} cartes${bot}`, { color: DIM_TEXT }))
    return framed(theme, withPicture(sprites, hero.sprite, column), HERO_WIDTH)
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
