import { describe, expect, test } from "vitest"
import { Toggle } from "@game/core-src/engine/ui/widget/Toggle"
import { plainText } from "@game/core-src/semantic/Text"
import { KINDS } from "@game/core-src/games/mecard/sim/analysis/Kinds"
import { TARGETS } from "@game/core-src/games/mecard/sim/analysis/Targets"
import { ALL_MONSTERS } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { PlayerCatalog } from "@game/core-src/games/mecard/persist/PlayerCatalog"
import { ConvertedCatalog } from "@game/core/mecard/converted-catalog"
import type { LibraryLook } from "@game/core/mecard/entries"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"
import { allUnder, wrapsUnder } from "./fixtures"

// --- Fixture builders ---

/** Units and objects with no pictures. */
const NO_SPRITES = {
    of: () => null, thing: () => null, cardBack: () => null, invalidCard: null,
} as unknown as LibraryLook["sprites"]

/** A catalogue of conversions on the main layer, laid out. */
function made(setup: UiSetup, unlocked: PlayerCatalog|null = null): ConvertedCatalog {
    const look: LibraryLook = { theme: setup.theme, sprites: NO_SPRITES, perRow: () => 4 }
    const catalog = new ConvertedCatalog(setup.theme, setup.popup, look, { width: () => 300, unlocked })
    setup.main.content.add(catalog, { x: "stretch", y: "stretch" })
    catalog.refresh()
    setup.ui.render()
    return catalog
}

/** How many entries the list holds. */
function listed(catalog: ConvertedCatalog): number {
    const wraps = wrapsUnder(catalog.list)
    return wraps[wraps.length - 1].children.length
}

// --- Tests ---

describe("ConvertedCatalog", () => {
    test("made → the monsters listed as beasts, each told by the name of its source", () => {
        const catalog = made(uiSetup())
        expect(catalog.source.id).toBe("monster")
        expect(catalog.target.id).toBe("beast")
        expect(listed(catalog)).toBe(ALL_MONSTERS.length)
        const keys = catalog.list.source.entries().map(entry => entry.key)
        expect(keys).toEqual(ALL_MONSTERS.map(each => each.name))
    })

    test("an entry → its bubble says the source, then what it became", () => {
        const catalog = made(uiSetup())
        const [first] = catalog.list.source.entries()
        const told = plainText(first.text)
        expect(told).toContain(ALL_MONSTERS[0].name)
        expect(told).toContain("→")
        expect(told).toContain("Course")
    })

    test("another target → the same sources listed as the other kind", () => {
        const setup = uiSetup()
        const catalog = made(setup)
        catalog.target = "module"
        setup.ui.render()
        expect(catalog.target.id).toBe("module")
        expect(catalog.targetChoice.selected).toBe("module")
        expect(listed(catalog)).toBe(ALL_MONSTERS.length)
    })

    test("another source → the things of that kind listed", () => {
        const setup = uiSetup()
        const catalog = made(setup)
        catalog.source = "kit"
        setup.ui.render()
        expect(listed(catalog)).toBeGreaterThan(0)
        expect(catalog.list.source.category).toBe("kits")
    })

    test("a kind that does not exist → refused", () => {
        const catalog = made(uiSetup())
        expect(() => { catalog.target = "dragon" }).toThrow()
    })

    test("the choice of target → the kinds, then what is only built", () => {
        const catalog = made(uiSetup())
        const ids = catalog.targetChoice.options.map(option => option.id)
        expect(ids).toEqual(TARGETS.map(target => target.id))
        expect(ids).toEqual(expect.arrayContaining(["fusion", "merged", "element"]))
    })

    test("the choice of source → only the kinds, never what is only built", () => {
        const catalog = made(uiSetup())
        const ids = catalog.sourceChoice.options.map(option => option.id)
        expect(ids).toEqual(KINDS.map(kind => kind.id))
        expect(() => { catalog.source = "fusion" }).toThrow()
    })

    test("a fusion as target → the monsters with a chain that stands for them, each told by its source", () => {
        const setup = uiSetup()
        const catalog = made(setup)
        catalog.target = "fusion"
        setup.ui.render()
        expect(catalog.target.id).toBe("fusion")
        const entries = catalog.list.source.entries()
        expect(entries.length).toBeGreaterThan(0)
        expect(entries.length).toBeLessThanOrEqual(ALL_MONSTERS.length)
        expect(plainText(entries[0].text)).toContain(" de ")
    })

    test("an element as target → the sources that found nothing are left out, not an error", () => {
        const setup = uiSetup()
        const catalog = made(setup)
        catalog.target = "element"
        setup.ui.render()
        expect(catalog.list.source.entries().length).toBeLessThan(ALL_MONSTERS.length)
    })

    test("a catalogue of the player and its toggle on → only the sources found are listed", () => {
        const setup = uiSetup()
        const found = new PlayerCatalog(null)
        found.discover("monsters", ALL_MONSTERS[1].name)
        const catalog = made(setup, found)
        const toggle = allUnder(catalog.filterBar).find(component => component instanceof Toggle) as Toggle
        toggle.activate()
        setup.ui.render()
        expect(listed(catalog)).toBe(1)
        expect(catalog.count.text).toBe(`1/${ALL_MONSTERS.length}`)
    })

    test("no catalogue of the player → no toggle for it", () => {
        const catalog = made(uiSetup())
        expect(allUnder(catalog.filterBar).filter(component => component instanceof Toggle)).toHaveLength(0)
    })
})
