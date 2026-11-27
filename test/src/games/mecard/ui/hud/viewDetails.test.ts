import { describe, expect, test } from "vitest"
import { Box } from "@game/core-src/engine/ui/layout/Box"
import { Heart } from "@game/core-src/games/mecard/sim/heart/Heart"
import { RED_HEART } from "@game/core-src/games/mecard/sim/heart/subs/RedHeartKind"
import { Detail } from "@game/core/mecard/detail"
import { DeckPile } from "@game/core/mecard/deck-pile"
import { HeartView } from "@game/core/mecard/heart-view"
import { viewDetails } from "@game/core/mecard/view-details"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A row of a heart, a pile that tells something and a pile that tells nothing, on the main layer. */
function bench(): { setup: UiSetup, row: Box, pile: DeckPile, mute: DeckPile } {
    const setup = uiSetup()
    const row = new Box("row")
    const heart = new HeartView(setup.theme, new Heart(RED_HEART))
    const pile = new DeckPile(setup.theme, null, 3, false)
    pile.detail = "PILE"
    const mute = new DeckPile(setup.theme, null, 3, false)
    row.add(heart)
    row.add(pile)
    row.add(mute)
    setup.main.content.add(row, { offsetX: 0, offsetY: 0 })
    setup.ui.render()
    return { setup, row, pile, mute }
}

// --- Tests ---

describe("viewDetails", () => {
    test("heart, pile with a text and pile without → one detail for each of the first two", () => {
        const { row } = bench()
        const details = viewDetails(row)
        expect(details).toHaveLength(2)
    })

    test("pointer over the pile with a text → shows its text, then hides when it leaves", () => {
        const { setup, row, pile } = bench()
        setup.port.send({ type: "pointer-move", x: 400, y: 400 })
        setup.frame()
        const all = Detail.all(...viewDetails(row))
        const heard: string[] = []
        all.listen({ onShow: shown => heard.push(String(shown.text)), onHide: () => heard.push("hide") })
        const { x, y, width, height } = pile.bounds
        setup.port.send({ type: "pointer-move", x: x + width / 2, y: y + height / 2 })
        setup.frame()
        setup.port.send({ type: "pointer-move", x: 400, y: 400 })
        setup.frame()
        expect(heard).toEqual(["PILE", "hide"])
    })
})
