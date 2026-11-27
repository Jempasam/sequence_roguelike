import { describe, expect, test } from "vitest"
import { Toggle } from "@game/core-src/engine/ui/widget/Toggle"
import type { EntryFilter } from "@game/core/mecard/entries"
import { CatalogBrowser } from "@game/core/mecard/catalog-browser"
import type { CatalogBrowserOptions } from "@game/core/mecard/catalog-browser"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"
import { allUnder, centerOf, section, wrapsUnder } from "./fixtures"

// --- Fixture builders ---

const EVEN: EntryFilter = { id: "even", label: "Pairs", test: entry => entry.key.length % 2 === 0 }

/** A browser of two sections on the main layer, the first with a filter of its own. */
function made(setup: UiSetup, more: Partial<CatalogBrowserOptions> = {}): CatalogBrowser {
    const browser = new CatalogBrowser(setup.theme, {
        sections: [
            section(setup.theme, "Monstres", "Unités", "monsters", ["ab", "abc", "abcd"], [EVEN]),
            section(setup.theme, "Cartes", "Cartes", "cards", ["x", "y"]),
        ],
        width: () => 300,
        ...more,
    })
    setup.main.content.add(browser, { x: "stretch", y: "stretch" })
    setup.ui.render()
    return browser
}

/** How many entries the list holds. */
function listed(browser: CatalogBrowser): number {
    const wraps = wrapsUnder(browser.list)
    return wraps[wraps.length - 1].children.length
}

// --- Tests ---

describe("CatalogBrowser", () => {
    test("made → the entries of the first section listed and counted", () => {
        const browser = made(uiSetup())
        expect(browser.section?.title).toBe("Monstres")
        expect(listed(browser)).toBe(3)
        expect(browser.count.text).toBe("3")
    })

    test("another tab chosen → its entries listed in place", () => {
        const setup = uiSetup()
        const browser = made(setup)
        browser.selected = 1
        setup.ui.render()
        expect(listed(browser)).toBe(2)
        expect(browser.section?.title).toBe("Cartes")
    })

    test("types allowed → only those tabs, and the entries of the first of them", () => {
        const browser = made(uiSetup(), { allowed: new Set(["cards"]) })
        expect(browser.sections.map(each => each.title)).toEqual(["Cartes"])
        expect(listed(browser)).toBe(2)
    })

    test("a section with a filter → its toggle offered, and the filter keeps its entries", () => {
        const setup = uiSetup()
        const browser = made(setup)
        const toggle = allUnder(browser.filterBar).find(component => component instanceof Toggle) as Toggle
        toggle.activate()
        setup.ui.render()
        expect(listed(browser)).toBe(2)
        expect(browser.count.text).toBe("2")
    })

    test("a filter given to the browser → offered on every tab", () => {
        const setup = uiSetup()
        const browser = made(setup, { filters: [{ id: "short", label: "Court", test: entry => entry.key.length < 2 }] })
        browser.selected = 1
        expect(browser.filterBar.filters.map(filter => filter.id)).toEqual(["short"])
    })

    test("typed in the search → the entries narrowed, and kept on another tab", () => {
        const setup = uiSetup()
        const browser = made(setup)
        browser.search.onChange!("abc")
        setup.ui.render()
        expect(listed(browser)).toBe(2)
        browser.selected = 1
        expect(listed(browser)).toBe(0)
    })

    test("keys given → only those entries", () => {
        const browser = made(uiSetup(), { keys: new Set(["abc"]) })
        expect(listed(browser)).toBe(1)
    })

    test("an entry clicked, with onPick → told with its section and the entry", () => {
        const setup = uiSetup()
        const browser = made(setup)
        const picked: string[] = []
        browser.onPick = (each, entry) => picked.push(`${each.title}:${entry.key}`)
        setup.ui.render()
        const wraps = wrapsUnder(browser.list)
        const [x, y] = centerOf(wraps[wraps.length - 1].children[1])
        setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
        setup.port.send({ type: "pointer-up", button: 0, x, y })
        setup.frame()
        expect(picked).toEqual(["Monstres:abc"])
    })

    test("listed → what the entries hover is given to the owner, no bubble made", () => {
        const setup = uiSetup()
        const browser = made(setup)
        let given = 0
        browser.onDetail = () => given++
        browser.selected = 1
        expect(given).toBeGreaterThan(0)
        expect(setup.ui.layers.map(layer => layer.name)).toEqual(["main", "popup"])
    })

    test("the toggle of what the player found offered and turned on → the list is only that", () => {
        const setup = uiSetup()
        const browser = made(setup, { unlockedToggle: true })
        const toggle = allUnder(browser.filterBar).find(component => component instanceof Toggle) as Toggle
        expect(toggle.text).toBe("Débloqué")
        expect(browser.playerOnly).toBe(false)
    })
})
