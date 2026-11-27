import { describe, expect, test } from "vitest"
import { Button } from "@game/core-src/engine/ui/widget/Button"
import { SectionTabs } from "@game/core/mecard/section-tabs"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"
import { allUnder, section, wrapsUnder } from "./fixtures"

// --- Fixture builders ---

/** Tabs of three sections in two groups, on the main layer. */
function made(setup: UiSetup, allowed: Set<"monsters"|"kits"|"cards"> | null = null): SectionTabs {
    const tabs = new SectionTabs(setup.theme, [
        section(setup.theme, "Monstres", "Unités", "monsters", ["a"]),
        section(setup.theme, "Aventuriers", "Unités", "kits", ["b"]),
        section(setup.theme, "Cartes", "Cartes", "cards", ["c"]),
    ], { width: () => 300, allowed })
    setup.main.content.add(tabs)
    setup.ui.render()
    return tabs
}

function buttons(tabs: SectionTabs): Button[] {
    return allUnder(tabs).filter(component => component instanceof Button) as Button[]
}

// --- Tests ---

describe("SectionTabs", () => {
    test("made → a tab for each section, the first chosen", () => {
        const tabs = made(uiSetup())
        expect(buttons(tabs).map(button => button.text)).toEqual(["Monstres", "Aventuriers", "Cartes"])
        expect(tabs.selected).toBe(0)
        expect(tabs.section?.title).toBe("Monstres")
    })

    test("two groups → one bar between them, among the three tabs", () => {
        const tabs = made(uiSetup())
        const row = wrapsUnder(tabs)[0]
        expect(row.children).toHaveLength(4)
        expect(row.children[2]).not.toBeInstanceOf(Button)
    })

    test("types allowed → only those tabs offered", () => {
        const tabs = made(uiSetup(), new Set(["kits", "cards"]))
        expect(tabs.sections.map(each => each.title)).toEqual(["Aventuriers", "Cartes"])
        expect(buttons(tabs)).toHaveLength(2)
    })

    test("a tab clicked → chosen, and told with its section", () => {
        const tabs = made(uiSetup())
        const told: string[] = []
        tabs.onSelect = (each, index) => told.push(`${each.title}:${index}`)
        buttons(tabs)[2].activate()
        expect(tabs.selected).toBe(2)
        expect(told).toEqual(["Cartes:2"])
    })

    test("the chosen tab clicked again → nothing told", () => {
        const tabs = made(uiSetup())
        let told = 0
        tabs.onSelect = () => told++
        buttons(tabs)[0].activate()
        expect(told).toBe(0)
    })

    test("selected set → the tab is chosen, nothing told", () => {
        const tabs = made(uiSetup())
        let told = 0
        tabs.onSelect = () => told++
        tabs.selected = 1
        expect(tabs.section?.title).toBe("Aventuriers")
        expect(told).toBe(0)
    })

    test("refreshed → the tabs made again, the chosen one kept", () => {
        const tabs = made(uiSetup())
        tabs.selected = 2
        tabs.refresh()
        expect(buttons(tabs)).toHaveLength(3)
        expect(tabs.selected).toBe(2)
    })
})
