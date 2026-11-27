import { describe, expect, test } from "vitest"
import { Button } from "@game/core-src/engine/ui/widget/Button"
import { Dropdown } from "@game/core-src/engine/ui/widget/Dropdown"
import { Label } from "@game/core-src/engine/ui/widget/Label"
import { Paragraph } from "@game/core-src/engine/ui/widget/Paragraph"
import { Tabs } from "@game/core-src/engine/ui/widget/Tabs"
import { plainText } from "@game/core-src/semantic/Text"
import type { Component } from "@game/core-src/engine/ui/Component"
import { ConverterScreen } from "@game/core/mecard/converter-screen"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import { allUnder, centerOf, wrapsUnder } from "./fixtures"

// --- Fixture builders ---

/** Units and objects with no pictures. */
const NO_SPRITES = {
    of: () => null, thing: () => null, cardBack: () => null, invalidCard: null,
} as unknown as ConstructorParameters<typeof ConverterScreen>[3]

/** A bench on a fake interface, shown, laid out once. */
function shown(height = 400): { screen: ConverterScreen, left: number[], setup: ReturnType<typeof uiSetup> } {
    const setup = uiSetup({}, 600, height)
    const left: number[] = []
    const screen = new ConverterScreen(setup.theme, setup.ui, { leave: () => left.push(1) }, NO_SPRITES)
    screen.visible = true
    screen.frame(setup.frame())
    setup.ui.render()
    return { screen, left, setup }
}

function rootOf(setup: ReturnType<typeof uiSetup>): Component {
    return setup.ui.layers.find(layer => layer.name === "converter")!.content
}

/** The tabs of the bench. */
function tabsOf(setup: ReturnType<typeof uiSetup>): Tabs {
    return allUnder(rootOf(setup)).find(component => component instanceof Tabs) as Tabs
}

/** The texts of the labels and paragraphs under a component. */
function textsUnder(root: Component): string[] {
    return allUnder(root)
        .filter(component => component instanceof Label || component instanceof Paragraph)
        .map(component => plainText((component as Label|Paragraph).text))
}

/** Click the first entry of the tab of the monsters, in the list that the browser holds. */
function clickFirstEntry(setup: ReturnType<typeof uiSetup>, screen: ConverterScreen): void {
    const tab = allUnder(rootOf(setup)).find(component => component instanceof Button && component.text === "Monstres")
    ;(tab as Button).activate()
    setup.ui.render()
    const wraps = wrapsUnder(rootOf(setup))
    const entries = wraps[wraps.length - 1]
    const [x, y] = centerOf(entries.children[0])
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.port.send({ type: "pointer-up", button: 0, x, y })
    screen.frame(setup.frame())
    setup.ui.render()
}

// --- Tests ---

describe("ConverterScreen", { timeout: 30_000 }, () => {
    test("made → hidden until shown, no layer of its own left in the way", () => {
        const setup = uiSetup({}, 600, 400)
        const screen = new ConverterScreen(setup.theme, setup.ui, { leave: () => {} }, NO_SPRITES)
        expect(screen.visible).toBe(false)
        expect(screen.profiles).toEqual([])
    })

    test("shown → three tabs, the first on a catalogue of the things a conversion starts from", () => {
        const { setup } = shown()
        const tabs = tabsOf(setup)
        expect(tabs.selected).toBe(0)
        const choices = allUnder(tabs).filter(component => component instanceof Dropdown)
        expect(choices.length).toBeGreaterThanOrEqual(1)
    })

    test("an entry clicked → what it becomes shown, and how its cards were read", () => {
        const { screen, setup } = shown()
        clickFirstEntry(setup, screen)
        expect(screen.profiles.length).toBeGreaterThan(0)
        expect(screen.profiles.every(line => line.includes(" : "))).toBe(true)
        expect(screen.profiles[0]).toMatch(/^.+ : (course|morsure|garde|visée|soutien|remplissage)/)
    })

    test("another target chosen → what the thing becomes is made again", () => {
        const { screen, setup } = shown()
        clickFirstEntry(setup, screen)
        const choice = allUnder(rootOf(setup)).filter(component => component instanceof Dropdown)
            .find(component => (component as Dropdown).selected === "beast") as Dropdown
        choice.selected = "module"
        choice.onSelect!("module")
        expect(screen.target.id).toBe("module")
        expect(screen.profiles.length).toBeGreaterThan(0)
    })

    test("the choice of target → the kinds and what is only built, the default still a kind", () => {
        const { screen, setup } = shown()
        const choice = allUnder(rootOf(setup)).filter(component => component instanceof Dropdown)
            .find(component => (component as Dropdown).selected === "beast") as Dropdown
        expect(choice.options.map(option => option.id)).toEqual(
            ["monster", "pet", "kit", "booster", "module", "beast", "fusion", "merged", "element"],
        )
        expect(screen.target.id).toBe("beast")
    })

    test("a fusion chosen as target → a card named after the unit made, the cards still read", () => {
        const { screen, setup } = shown()
        clickFirstEntry(setup, screen)
        const choice = allUnder(rootOf(setup)).filter(component => component instanceof Dropdown)
            .find(component => (component as Dropdown).selected === "beast") as Dropdown
        choice.selected = "fusion"
        choice.onSelect!("fusion")
        setup.ui.render()
        expect(screen.target.id).toBe("fusion")
        expect(textsUnder(rootOf(setup)).some(text => text.includes(" → ") && text.includes(" de "))).toBe(true)
        expect(screen.profiles.length).toBeGreaterThan(0)
    })

    test("an element chosen for a unit with no effects → told why, not as a failure", () => {
        const { screen, setup } = shown()
        clickFirstEntry(setup, screen)
        const choice = allUnder(rootOf(setup)).filter(component => component instanceof Dropdown)
            .find(component => (component as Dropdown).selected === "beast") as Dropdown
        choice.selected = "element"
        choice.onSelect!("element")
        setup.ui.render()
        const texts = textsUnder(rootOf(setup))
        expect(texts.some(text => text.includes("aucun élément possible"))).toBe(true)
        expect(texts.some(text => text.startsWith("Conversion impossible"))).toBe(false)
        expect(screen.profiles.length).toBeGreaterThan(0)
    })

    test("a target that finds nothing, then the analysis tab → the analysis shown with the reason first", () => {
        const { screen, setup } = shown()
        clickFirstEntry(setup, screen)
        const tabs = tabsOf(setup)
        tabs.selected = 1
        setup.ui.render()
        const choice = allUnder(tabs).find(component => component instanceof Dropdown) as Dropdown
        choice.selected = "element"
        choice.onSelect!("element")
        setup.ui.render()
        const texts = textsUnder(tabs)
        expect(texts.some(text => text.startsWith("Rien n'est construit : aucun élément possible"))).toBe(true)
        expect(texts).toContain("Algorithme")
        expect(texts).toContain("Les effets des cartes")
        expect(screen.target.id).toBe("element")
    })

    test("the third tab → the catalogue of converted things", () => {
        const { setup } = shown()
        const tabs = tabsOf(setup)
        tabs.selected = 2
        setup.ui.render()
        expect(tabs.selected).toBe(2)
        expect(allUnder(tabs).filter(component => component instanceof Dropdown)).toHaveLength(2)
    })

    test("the analysis tab, nothing chosen → told to choose a source first", () => {
        const { setup } = shown()
        const tabs = tabsOf(setup)
        tabs.selected = 1
        setup.ui.render()
        expect(textsUnder(tabs)).toContain("Choisir une source dans l'onglet Convertir.")
    })

    test("a monster chosen, then the analysis tab → its algorithm, cards, rounds and chains told", () => {
        const { screen, setup } = shown()
        clickFirstEntry(setup, screen)
        const tabs = tabsOf(setup)
        tabs.selected = 1
        setup.ui.render()
        const texts = textsUnder(tabs)
        expect(texts).toContain("Algorithme")
        expect(texts.some(text => text.startsWith("Round 1"))).toBe(true)
        expect(texts.some(text => text.startsWith("Course (profil course"))).toBe(true)
        expect(texts.some(text => text.startsWith("Chaîne principale (profil principale"))).toBe(true)
    })

    test("another target chosen on the analysis tab → the analysis is made again for it", () => {
        const { screen, setup } = shown()
        clickFirstEntry(setup, screen)
        const tabs = tabsOf(setup)
        tabs.selected = 1
        setup.ui.render()
        const choice = allUnder(tabs).find(component => component instanceof Dropdown) as Dropdown
        choice.selected = "module"
        choice.onSelect!("module")
        setup.ui.render()
        expect(screen.target.id).toBe("module")
        expect(textsUnder(tabs).some(text => text.includes("monstre → module"))).toBe(true)
    })

    test("hidden → the menus of its choices closed, the bubbles with it", () => {
        const { screen, setup } = shown()
        screen.visible = false
        expect(rootOf(setup).visible).toBe(false)
    })
})
