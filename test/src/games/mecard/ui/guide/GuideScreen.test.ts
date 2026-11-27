import { describe, expect, test } from "vitest"
import { Container } from "@game/core-src/engine/ui/Container"
import { Label } from "@game/core-src/engine/ui/widget/Label"
import { plainText } from "@game/core-src/semantic/Text"
import type { Component } from "@game/core-src/engine/ui/Component"
import type { Box } from "@game/core-src/engine/ui/layout/Box"
import { DECK } from "@game/core-src/games/mecard/sim/base/keywords"
import { TURNS } from "@game/core-src/games/mecard/sim/card/subs/movement/TurnCard"
import { CardView } from "@game/core/mecard/card-view"
import { GuideScreen } from "@game/core/mecard/guide"
import { GUIDE } from "@game/core/mecard/guide-content"
import { cardNamed, cards, variantCard } from "@game/core/mecard/guide-blocks"

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

describe("variantCard", () => {
    test("a variant chosen → the card shown is that variant, alone", () => {
        const setup = uiSetup({}, 320, 180)
        const block = variantCard(TURNS[0])
        const holder = (block({ theme: setup.theme, hearLink: () => {} }) as Box).children[0] as Box
        const first = holder.children[0] as CardView
        expect(first.card).toBe(TURNS[0])
        first.onVariant!(TURNS[3])
        expect(holder.children).toHaveLength(1)
        const next = holder.children[0] as CardView
        expect(next.card).toBe(TURNS[3])
        expect(next.onVariant).not.toBeNull()
    })

    test("the guide of the game → names the infinite cards with a card to try", () => {
        const { screen } = guide()
        const found: CardView[] = []
        const visit = (component: unknown): void => {
            if(component instanceof CardView && component.card === TURNS[0]) found.push(component)
            for(const child of (component as Box).children ?? []) visit(child)
        }
        visit(screen.scroll.content)
        expect(found.length).toBeGreaterThan(0)
    })
})

describe("GuideScreen, what is hovered", () => {
    test("every block of the guide builds, with its text and its cards", () => {
        const { screen } = guide()
        expect((screen.scroll.content as Box).children).toHaveLength(GUIDE.length)
    })

    test("a word named in the text, hovered → a bubble explains it", () => {
        const { screen } = guide()
        screen.tooltip.hearLink(DECK, { x: 10, y: 10, width: 5, height: 5 } as never)
        expect(plainText(screen.tooltip.text!)).toContain("réserve")
        screen.tooltip.hearLink(null, null)
        expect(screen.tooltip.open).toBe(false)
    })

    test("a card hovered → a bubble opens with what it does, and closes when the pointer leaves", () => {
        const { screen, setup } = guide([cards([cardNamed("Estoc")], "Une carte.")])
        setup.ui.render()
        const find = (root: Component): Component|null => {
            if(root instanceof CardView) return root
            if(!(root instanceof Container)) return null
            for(const child of root.children){
                const found = find(child)
                if(found) return found
            }
            return null
        }
        const view = find(screen.scroll.content!)!
        let x = view.bounds.width / 2
        let y = view.bounds.height / 2
        for(let each: Component|null = view; each; each = each.parent){
            x += each.bounds.x
            y += each.bounds.y
        }
        const bubbles = () => setup.ui.layers.find(layer => layer.name === "guide-tooltip")!.content.children
        setup.port.send({ type: "pointer-move", x: Math.floor(x), y: Math.floor(y) })
        screen.frame(setup.frame())
        expect(bubbles().length).toBeGreaterThan(0)
        setup.port.send({ type: "pointer-move", x: 0, y: 0 })
        screen.frame(setup.frame())
        expect(bubbles()).toHaveLength(0)
    })

    test("no box of details → the guide takes the whole height, down to its button back", () => {
        const { screen, setup } = guide()
        setup.ui.render()
        const { bounds } = screen.backButton
        let bottom = bounds.y + bounds.height
        for(let each = screen.backButton.parent; each; each = each.parent) bottom += each.bounds.y
        expect(bottom).toBeGreaterThan(setup.ui.height - 20)
    })
})
