import { describe, expect, test } from "vitest"
import { plainText, Scroll, TextInput, WrapBox } from "@game/core"
import type { Component } from "@game/core"
import { ALL_KITS } from "@game/core/mecard"
import type { Card } from "@game/core/mecard"
import { LibraryScreen } from "@game/core/mecard/library"

import { uiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** Units and objects with no pictures. */
const NO_SPRITES = {
    of: () => null, thing: () => null, cardBack: () => null, invalidCard: null,
} as unknown as ConstructorParameters<typeof LibraryScreen>[3]

/** A catalogue on a fake interface, shown, laid out once. */
function shown(height = 180): { screen: LibraryScreen, left: number[], setup: ReturnType<typeof uiSetup> } {
    const setup = uiSetup({}, 320, height)
    const left: number[] = []
    const screen = new LibraryScreen(setup.theme, setup.ui, { leave: () => left.push(1) }, NO_SPRITES)
    screen.visible = true
    screen.frame(setup.frame())
    setup.ui.render()
    return { screen, left, setup }
}

/** Every component under another, itself included. */
function allUnder(root: Component): Component[] {
    const found: Component[] = [root]
    const children = (root as { children?: readonly Component[] }).children ?? []
    for(const child of children) found.push(...allUnder(child))
    return found
}

/** How many entries the list of the tab shown holds. */
function entriesOf(setup: ReturnType<typeof uiSetup>): number {
    // The first wrapping box holds the tabs, the last the entries.
    const wraps = allUnder(setup.ui.layers.find(layer => layer.name === "library")!.content)
        .filter(component => component instanceof WrapBox) as WrapBox[]
    return wraps[wraps.length - 1].children.length
}

// --- Tests ---

describe("LibraryScreen", () => {
    test("made → twelve tabs, the cards first, hidden until shown", () => {
        const setup = uiSetup({}, 320, 180)
        const screen = new LibraryScreen(setup.theme, setup.ui, { leave: () => {} }, NO_SPRITES)
        expect(screen.visible).toBe(false)
        expect(screen.titles).toHaveLength(16)
        expect(screen.titles[0]).toBe("Cartes")
    })

    test("shown → the entries of the first tab listed in a scroll", () => {
        const { setup } = shown()
        expect(entriesOf(setup)).toBeGreaterThan(50)
        const scrolls = allUnder(setup.ui.layers.find(layer => layer.name === "library")!.content)
            .filter(component => component instanceof Scroll)
        // The tabs, the list, and the text of the box of details.
        expect(scrolls).toHaveLength(3)
    })

    test("another tab chosen → its entries listed in place", () => {
        const { screen, setup } = shown()
        const cards = entriesOf(setup)
        screen.selected = 1
        setup.ui.render()
        expect(screen.selected).toBe(1)
        expect(entriesOf(setup)).not.toBe(cards)
    })

    test("pointer over an entry → the box of details says its text, then its hint when it leaves", () => {
        const { screen, setup } = shown()
        const hint = screen.detail.text
        const wraps = allUnder(setup.ui.layers.find(layer => layer.name === "library")!.content)
            .filter(component => component instanceof WrapBox) as WrapBox[]
        const entry = wraps[wraps.length - 1].children[0]
        let x = entry.bounds.width / 2
        let y = entry.bounds.height / 2
        for(let each: Component|null = entry; each; each = each.parent){
            x += each.bounds.x
            y += each.bounds.y
        }
        setup.port.send({ type: "pointer-move", x: Math.floor(x), y: Math.floor(y) })
        screen.frame(setup.frame())
        expect(screen.detail.text).not.toBe(hint)
        setup.port.send({ type: "pointer-move", x: 0, y: 0 })
        screen.frame(setup.frame())
        expect(screen.detail.text).toBe(hint)
    })

    test("pointer over a card of an entry → the box of details says that card, not the entry", () => {
        // Tall enough for the cards of the first entry to lie in the list, not cut by it.
        const { screen, setup } = shown(600)
        screen.selected = 4
        setup.ui.render()
        const root = setup.ui.layers.find(layer => layer.name === "library")!.content
        // A card view: the one component that holds a card and tells its hover.
        const view = allUnder(root).find(component => "card" in component && "onHover" in component) as
            Component & { card: Card }
        // Its left edge: the cards of a row may overlap, the next one lying over the middle of this one.
        let x = 1
        let y = view.bounds.height / 2
        for(let each: Component|null = view; each; each = each.parent){
            x += each.bounds.x
            y += each.bounds.y
        }
        setup.port.send({ type: "pointer-move", x: Math.floor(x), y: Math.floor(y) })
        expect(x).toBeGreaterThan(0)
        screen.frame(setup.frame())
        expect(plainText(screen.detail.text)).toContain(view.card.name)
        expect(plainText(screen.detail.text)).toContain(plainText(view.card.description))
    })

    test("adventurers searched by name or by a card → the kit is found", () => {
        const { screen, setup } = shown()
        screen.selected = screen.titles.indexOf("Aventuriers")
        setup.ui.render()
        const all = entriesOf(setup)
        const input = allUnder(setup.ui.layers.find(layer => layer.name === "library")!.content)
            .find(component => component instanceof TextInput) as TextInput
        const kit = ALL_KITS[0]
        for(const word of [kit.name, kit.cards[0].name]){
            input.onChange!(word)
            setup.ui.render()
            const found = entriesOf(setup)
            expect(found, word).toBeGreaterThan(0)
            expect(found, word).toBeLessThanOrEqual(all)
        }
        input.onChange!("zzzqqq")
        setup.ui.render()
        expect(entriesOf(setup)).toBe(0)
    })

    test("every tab → entries can be built", () => {
        const { screen, setup } = shown()
        for(let index = 0; index < screen.titles.length; index++){
            screen.selected = index
            setup.ui.render()
            expect(entriesOf(setup), screen.titles[index]).toBeGreaterThan(0)
        }
    })
})
