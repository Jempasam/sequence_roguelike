import { describe, expect, test } from "vitest"
import type { Component } from "@game/core"
import { AIM, STEP, THRUST } from "@game/core/mecard"
import { DeckView } from "@game/core/mecard/deck-view"
import type { DeckViewOptions } from "@game/core/mecard/deck-view"

import { uiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** How wide a small card is, and the space after it, so a room is counted in cards. */
const MINI_STEP = 34

/** The cards of a deck view, from its rows: they are the rows it holds, past its name. */
function cardsOf(view: DeckView): { deck: number|null, dimmed: boolean, onPick: unknown }[] {
    const rows = view.children.filter(child => "children" in child) as unknown as { children: Component[] }[]
    return rows.flatMap(row => row.children) as never
}

function deckView(options: Partial<DeckViewOptions> = {}): DeckView {
    const { theme } = uiSetup()
    return new DeckView(theme, [STEP, AIM, THRUST], { room: 3 * MINI_STEP, size: "mini", ...options })
}

// --- Tests ---

describe("DeckView", () => {
    test("a place among the decks → every card takes its color", () => {
        expect(cardsOf(deckView({ deck: 2 })).map(card => card.deck)).toEqual([2, 2, 2])
    })

    test("a room for two cards → the third goes to a second row", () => {
        expect(deckView().children).toHaveLength(1)
        expect(deckView({ room: 2 * MINI_STEP }).children).toHaveLength(2)
    })

    test("a name → above its cards, in its own child", () => {
        expect(deckView({ name: "Deck 1" }).children).toHaveLength(2)
    })

    test("only shown → no card dimmed, none to pick", () => {
        for(const card of cardsOf(deckView())){
            expect(card.dimmed).toBe(false)
            expect(card.onPick).toBeNull()
        }
    })

    test("offered → what is given nothing is dim, the rest picks", () => {
        const pick = (): void => {}
        const view = deckView({ pickable: card => card === AIM ? null : { picked: false, pick } })
        expect(cardsOf(view).map(card => card.dimmed)).toEqual([false, true, false])
        expect(cardsOf(view).map(card => card.onPick)).toEqual([pick, null, pick])
    })
})
