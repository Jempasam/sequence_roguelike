import { ArrowScroll, Box } from "../../../../engine/ui"
import type { Component, Theme } from "../../../../engine/ui"
import type { Hero } from "../../sim/run/Hero"

import type { UnitSprites } from "../look/UnitSprites"
import { heroCard } from "./HeroCard"

/** The space between the cards of the heroes of a party, in virtual pixels. */
const CARD_GAP = 4

/**
 * The cards of the heroes of a party on one row, as high as the tallest, scrolling across by the buttons on
 * its edges when they do not all fit.
 */
export function partyRow(theme: Theme, sprites: UnitSprites, heroes: readonly Hero[]): Component {
    const row = new Box("row", { gap: CARD_GAP, align: "start" })
    for(const hero of heroes) row.add(heroCard(theme, sprites, hero))
    const scroll = new ArrowScroll(theme)
    scroll.content = row
    return scroll
}
