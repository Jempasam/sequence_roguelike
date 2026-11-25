import { Box, Label, NineSlice, Panel } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import { deckColorOf } from "../../sim/run/deckName"
import type { Hero } from "../../sim/run/Hero"

import { engineColor } from "../look/colors"
import { DIM_TEXT } from "../look/theme"
import { deckSizes } from "./historyFormat"

/** How big the chip of a deck is, around its center. */
const CHIP_PADDING = 3

/**
 * What a hero holds in its decks, on one row: how many cards in all, then for each deck a chip in its color
 * and the number of cards it holds.
 */
export function deckSummary(theme: Theme, hero: Hero): Component {
    const sizes = deckSizes(hero)
    const total = sizes.reduce((sum, size) => sum + size, 0)
    const row = new Box("row", { gap: 6, align: "center" })
    row.add(new Label(theme, total === 1 ? "1 carte" : `${total} cartes`, { color: DIM_TEXT }))
    sizes.forEach((size, place) => {
        const chip = new Panel(theme, {
            background: NineSlice.flat(theme.white, engineColor(deckColorOf(place))),
            padding: CHIP_PADDING, interactive: false,
        })
        chip.content = new Box("row")
        const deck = new Box("row", { gap: 2, align: "center" })
        deck.add(chip)
        deck.add(new Label(theme, String(size), { color: DIM_TEXT }))
        row.add(deck)
    })
    return row
}
