import { describe, expect, test } from "vitest"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { CardView } from "@game/core/mecard/card-view"
import { PlayerCatalog } from "@game/core-src/games/mecard/persist/PlayerCatalog"
import type { Entry } from "@game/core/mecard/entries"
import { CatalogList } from "@game/core/mecard/catalog-list"
import type { CatalogSource } from "@game/core/mecard/catalog-list"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"
import { centerOf, entry, wrapsUnder } from "./fixtures"

// --- Fixture builders ---

const KEYS = ["Éclair", "Feu", "Gobelin", "Loup"]

/** A list of four entries on the main layer, laid out. */
function made(
    setup: UiSetup, unlocked: PlayerCatalog|null = null,
): { list: CatalogList, source: CatalogSource } {
    const source: CatalogSource = {
        category: "monsters",
        entries: () => KEYS.map(key => entry(setup.theme, key, key.length)),
    }
    const list = new CatalogList(setup.theme, source, { unlocked, width: () => 300 })
    setup.main.content.add(list, { x: "stretch", y: "stretch" })
    list.refresh()
    setup.ui.render()
    return { list, source }
}

/** How many entries are in the list. */
function listed(list: CatalogList): number {
    return wrapsUnder(list)[0].children.length
}

// --- Tests ---

describe("CatalogList", () => {
    test("refreshed → all the entries of the source listed, and counted", () => {
        const setup = uiSetup()
        const counts: [number, number][] = []
        const { list } = made(setup)
        list.onCount = (shown, total) => counts.push([shown, total])
        list.refresh()
        expect(listed(list)).toBe(4)
        expect(counts).toEqual([[4, 4]])
    })

    test("typed without the accent or the case → the entry is found", () => {
        const setup = uiSetup()
        const { list } = made(setup)
        list.query = "ECLAIR"
        setup.ui.render()
        expect(list.shown).toBe(1)
        expect(listed(list)).toBe(1)
        list.query = "zzz"
        expect(list.shown).toBe(0)
    })

    test("a filter on → only the entries that pass it, and all again once off", () => {
        const setup = uiSetup()
        const { list } = made(setup)
        const long = { id: "long", label: "Long", test: (each: Entry) => (each.value as number) > 4 }
        list.filters = [long]
        expect(list.shown).toBe(2)
        list.filters = []
        expect(list.shown).toBe(4)
    })

    test("only what the player found → the others hidden, the total still the whole", () => {
        const setup = uiSetup()
        const catalog = new PlayerCatalog(null)
        catalog.discover("monsters", "Loup")
        const { list } = made(setup, catalog)
        const counts: [number, number][] = []
        list.onCount = (shown, total) => counts.push([shown, total])
        list.playerOnly = true
        expect(list.shown).toBe(1)
        expect(counts[counts.length - 1]).toEqual([1, 4])
    })

    test("a list that cannot tell what was found → playerOnly stays off", () => {
        const setup = uiSetup()
        const { list } = made(setup)
        list.playerOnly = true
        expect(list.playerOnly).toBe(false)
        expect(list.shown).toBe(4)
    })

    test("keys given → only those entries listed", () => {
        const setup = uiSetup()
        const { list } = made(setup)
        list.keys = new Set(["Feu", "Loup"])
        expect(list.shown).toBe(2)
    })

    test("a new source → listed in place of the old one", () => {
        const setup = uiSetup()
        const { list } = made(setup)
        list.use({ category: null, entries: () => [entry(setup.theme, "seul")] }, [])
        expect(listed(list)).toBe(1)
    })

    test("refreshed → what the entries hover is given to the parent each time", () => {
        const setup = uiSetup()
        const { list } = made(setup)
        const given: unknown[] = []
        list.onDetail = detail => given.push(detail)
        list.refresh()
        list.query = "feu"
        expect(given).toHaveLength(2)
        expect(given[0]).not.toBe(given[1])
        expect(list.detail).toBe(given[1])
    })

    test("an entry clicked, when the list can be picked → it is told with the entry", () => {
        const setup = uiSetup()
        const { list } = made(setup)
        const picked: string[] = []
        list.onPick = each => picked.push(each.key)
        list.refresh()
        setup.ui.render()
        const [x, y] = centerOf(wrapsUnder(list)[0].children[2])
        setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
        setup.port.send({ type: "pointer-up", button: 0, x, y })
        setup.frame()
        expect(picked).toEqual(["Gobelin"])
    })

    test("a card of an entry pressed, when the list can be picked → the entry is picked all the same", () => {
        const setup = uiSetup()
        const source: CatalogSource = {
            category: null,
            entries: () => [{
                view: new CardView(setup.theme, STEP, "hand"), text: "step", key: "step", value: STEP,
            }],
        }
        const list = new CatalogList(setup.theme, source, { width: () => 300 })
        const picked: string[] = []
        list.onPick = each => picked.push(each.key)
        setup.main.content.add(list, { x: "stretch", y: "stretch" })
        list.refresh()
        setup.ui.render()
        const [x, y] = centerOf(wrapsUnder(list)[0].children[0])
        setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
        setup.port.send({ type: "pointer-up", button: 0, x, y })
        setup.frame()
        expect(picked).toEqual(["step"])
    })

    test("an entry clicked, when the list cannot be picked → nothing happens", () => {
        const setup = uiSetup()
        const { list } = made(setup)
        const [x, y] = centerOf(wrapsUnder(list)[0].children[0])
        setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
        setup.port.send({ type: "pointer-up", button: 0, x, y })
        expect(() => setup.frame()).not.toThrow()
    })
})
