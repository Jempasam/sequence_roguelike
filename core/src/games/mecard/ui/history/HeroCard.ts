import { Box, Label } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { Hero } from "../../sim/run/Hero"

import { unitView } from "../hud/unitView"
import type { UnitSprites } from "../look/UnitSprites"
import { DIM_TEXT } from "../look/theme"
import { deckSummary } from "./DeckSummary"
import { deckOfCard, isDead } from "./historyFormat"

/** What the card of a hero that fell says. */
const FALLEN_TEXT = "Tombé au combat"

/**
 * A hero of a game of the history: as a unit is shown, its cards on one row, each on the color of the deck it
 * is the most in, then whether it fell and what its decks hold.
 */
export function heroCard(theme: Theme, sprites: UnitSprites, hero: Hero): Component {
    const column = new Box("column", { gap: 2, align: "stretch" })
    if(isDead(hero)) column.add(new Label(theme, FALLEN_TEXT, { color: DIM_TEXT, align: "center" }))
    column.add(unitView(theme, sprites, hero, { deckOf: card => deckOfCard(hero, card) }))
    column.add(deckSummary(theme, hero))
    return column
}
