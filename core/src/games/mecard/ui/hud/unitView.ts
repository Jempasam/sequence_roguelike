import { Box, Label, Paragraph } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { Text } from "../../../../semantic"
import type { Card } from "../../sim/card/Card"
import { allCards, baseOf } from "../../sim/run/Hero"
import type { Hero } from "../../sim/run/Hero"
import { CHOSEN_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"
import { cardsOption } from "./ChoiceOptions"
import { heartsRow } from "./HeartView"
import { stuffRow } from "./stuffRow"
import { withPicture } from "./UnitPicture"

/** How wide a unit shown without its cards is at least, in virtual pixels. */
const BARE_WIDTH = 84

/** What a unit shows of its deck: the cards to lay out, and whether to tell how many cards it has. */
export interface UnitDeckShown {
    readonly cards: readonly Card[]

    /** Tell how many cards it has: the cards shown are not each of its cards, so they do not tell it. */
    readonly count: boolean
}

/** How a unit is shown. */
export interface UnitViewOptions {
    /** What it says of itself under its name, nothing when none. */
    readonly description?: Text|null

    /** Show its cards? Yes by default. */
    readonly cards?: boolean

    /** How many cards at most lie in a row, the others going on rows under it. All in one row when none. */
    readonly perRow?: number

    /** The place of the deck its cards come from, which colors them, none for cards of no deck. */
    readonly deck?: number|null
}

/**
 * The cards a unit shows. A unit that always plays the same chain, its deck kept in order and as big as what
 * it draws at first, then each round, and as its chain, shows that chain: the cards tell how many it has.
 * Any other shows one of each card of its decks, and how many cards it has when it has several of one.
 */
export function unitDeckShown(unit: Hero): UnitDeckShown {
    const all = allCards(unit)
    const always = baseOf(unit, "ordered")
        && [baseOf(unit, "draw"), baseOf(unit, "firstDraw"), baseOf(unit, "chainSize")].every(size => size === all.length)
    if(always) return { cards: all, count: false }
    const kinds = [...new Set(all)]
    return { cards: kinds, count: kinds.length < all.length }
}

/** Who a unit is, on one row: its sprite, its name and its hearts. */
export function unitHead(theme: Theme, unit: Hero, sprites: UnitSprites): Component {
    const row = new Box("row", { gap: 4, align: "center" })
    row.add(new Label(theme, unit.name, { color: CHOSEN_TEXT }))
    row.add(heartsRow(theme, unit.hearts, () => {}))
    return withPicture(sprites, unit.sprite, row)
}

/**
 * A unit, as a character, a monster or a pet is shown, in a frame. From top to bottom, each line left out
 * when it has nothing to tell: its name and hearts, its description, its cards (see {@link unitDeckShown}),
 * then how many cards it has, its items and its usables.
 */
export function unitView(
    theme: Theme, sprites: UnitSprites, unit: Hero, options: UnitViewOptions = {},
): Component {
    const { description = null, cards: withCards = true, perRow, deck } = options
    const shown = unitDeckShown(unit)
    const head = new Box("column", { gap: 2, align: "center" })
    head.add(unitHead(theme, unit, sprites))
    if(description !== null) head.add(new Paragraph(theme, description), { align: "stretch" })
    return cardsOption(theme, withCards ? shown.cards : [], null, {
        head,
        under: stuffRow(theme, sprites, unit, shown.count || !withCards),
        perRow,
        deck,
        overlapped: true,
        least: withCards ? undefined : BARE_WIDTH,
    })
}
