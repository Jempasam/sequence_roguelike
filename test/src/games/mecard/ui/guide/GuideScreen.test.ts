import { describe, expect, test } from "vitest"
import { Label, concat, plainText } from "@game/core"
import type { Box } from "@game/core"
import { DECK } from "@game/core/mecard"
import { GuideScreen } from "@game/core/mecard/guide"
import { GUIDE } from "@game/core/mecard/guide-content"
import { cardNamed } from "@game/core/mecard/guide-blocks"

import { uiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A guide of the given blocks, and how many times it was left. */
function guide(blocks = GUIDE) {
    const setup = uiSetup({}, 320, 180)
    const left = { count: 0 }
    const screen = new GuideScreen(setup.theme, setup.ui, { leave: () => left.count++ }, blocks)
    screen.visible = true
    screen.frame(setup.frame())
    setup.ui.render()
    return { screen, left, setup }
}

// --- Tests ---

describe("GuideScreen", () => {
    test("hidden at first, shown once asked", () => {
        const setup = uiSetup({}, 320, 180)
        const screen = new GuideScreen(setup.theme, setup.ui, { leave: () => {} })
        expect(screen.visible).toBe(false)
        screen.visible = true
        expect(screen.visible).toBe(true)
    })

    test("the guide of the game → laid out, and long enough to scroll", () => {
        const { screen } = guide()
        expect(screen.scroll.content).not.toBeNull()
        expect(screen.scroll.overflows).toBe(true)
    })

    test("a block of its own → what it builds is in the text", () => {
        const { screen, setup } = guide([({ theme }) => new Label(theme, "Bonjour")])
        expect((screen.scroll.content as Box).children).toHaveLength(1)
        expect(setup.ui.layers.map(layer => layer.name)).toContain("guide")
    })

    test("the button back → the game is told", () => {
        const { screen, left } = guide()
        screen.backButton.activate()
        expect(left.count).toBe(1)
    })

    test("laid out again → the place read is kept", () => {
        const { screen, setup } = guide()
        screen.scroll.offset = 30
        screen.refresh()
        setup.ui.render()
        expect(screen.scroll.offset).toBe(30)
    })

    test("shown again → read from the start", () => {
        const { screen } = guide()
        screen.scroll.offset = 30
        screen.visible = false
        screen.visible = true
        expect(screen.scroll.offset).toBe(0)
    })
})

describe("GuideScreen, what is hovered", () => {
    test("every block of the guide builds, with its text and its cards", () => {
        const { screen } = guide()
        expect((screen.scroll.content as Box).children).toHaveLength(GUIDE.length)
    })

    test("a word named in the text, hovered → the box explains it", () => {
        const { screen } = guide()
        screen.detail.hearLink(DECK)
        expect(plainText(screen.detail.text)).toContain("réserve")
    })

    test("a card hovered by name → the box says what it does", () => {
        const { screen } = guide()
        const card = cardNamed("Estoc")
        screen.detail.tell(concat(card, " : ", card.description))
        expect(plainText(screen.detail.text)).toContain("Estoc")
    })

    test("the box lies at the foot of the screen, over the whole width", () => {
        const { screen, setup } = guide()
        setup.ui.render()
        const { bounds } = screen.detail
        expect(bounds.y + bounds.height).toBeGreaterThan(setup.ui.height - 10)
        expect(bounds.width).toBeGreaterThan(setup.ui.width - 12)
    })
})
