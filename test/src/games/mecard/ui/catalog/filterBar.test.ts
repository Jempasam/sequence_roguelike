import { describe, expect, test } from "vitest"
import { Toggle } from "@game/core"
import type { EntryFilter } from "@game/core/mecard/entries"
import { FilterBar } from "@game/core/mecard/filter-bar"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import { allUnder } from "./fixtures"

// --- Fixture builders ---

function filter(id: string): EntryFilter {
    return { id, label: id, test: () => true }
}

// --- Tests ---

describe("FilterBar", () => {
    test("filters offered → a toggle for each, none on", () => {
        const bar = new FilterBar(uiSetup().theme)
        bar.filters = [filter("a"), filter("b")]
        expect(allUnder(bar).filter(component => component instanceof Toggle)).toHaveLength(2)
        expect(bar.active).toEqual([])
    })

    test("a toggle turned over → the filter is on and the bar tells it", () => {
        const bar = new FilterBar(uiSetup().theme)
        const a = filter("a")
        bar.filters = [a, filter("b")]
        let told = 0
        bar.onChange = () => told++
        const toggle = allUnder(bar).find(component => component instanceof Toggle) as Toggle
        toggle.activate()
        expect(bar.active).toEqual([a])
        expect(told).toBe(1)
    })

    test("filters offered again → those that were on and are still offered stay on", () => {
        const bar = new FilterBar(uiSetup().theme)
        const a = filter("a")
        bar.filters = [a, filter("b")]
        ;(allUnder(bar).find(component => component instanceof Toggle) as Toggle).activate()
        const again = filter("a")
        bar.filters = [again, filter("c")]
        expect(bar.active).toEqual([again])
    })

    test("with the toggle of what the player found → offered first, and off to begin with", () => {
        const bar = new FilterBar(uiSetup().theme, true)
        bar.filters = [filter("a")]
        expect(allUnder(bar).filter(component => component instanceof Toggle)).toHaveLength(2)
        expect(bar.unlocked).toBe(false)
        bar.unlocked = true
        expect(bar.unlocked).toBe(true)
    })

    test("without that toggle → unlocked is never on", () => {
        const bar = new FilterBar(uiSetup().theme)
        bar.unlocked = true
        expect(bar.unlocked).toBe(false)
    })
})
