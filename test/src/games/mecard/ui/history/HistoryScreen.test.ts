import { describe, expect, test } from "vitest"
import { historyEntry } from "@game/core/mecard"
import type { HistoryEntry } from "@game/core/mecard"
import { FloorBorders } from "@game/core/mecard/floor-borders"
import { HistoryScreen } from "@game/core/mecard/history-screen"
import { UnitSprites } from "@game/core/mecard/unit-sprites"

import { startedRun } from "../../../../fixtures/startedRun"
import { uiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A history screen of many games, so its list overflows, the screen on a small interface. */
function crowded(count = 12) {
    const setup = uiSetup({}, 320, 120)
    const entries: HistoryEntry[] = []
    for(let seed = 1; seed <= count; seed++){
        const run = startedRun(seed)
        run.gold = seed
        entries.push(historyEntry(run, seed, seed))
    }
    const looks = { borders: new FloorBorders(), clipboard: null }
    const screen = new HistoryScreen(setup.theme, setup.ui, { leave: () => {} }, new UnitSprites(), looks)
    screen.entries = entries
    screen.visible = true
    screen.refresh()
    setup.ui.render()
    return { setup, screen, entries: screen.entries }
}

// --- Tests ---

describe("HistoryScreen", () => {
    test("the last game → opened out at first, the others folded up", () => {
        const { screen, entries } = crowded()
        expect(screen.isOpened(entries[0])).toBe(true)
        expect(screen.isOpened(entries[1])).toBe(false)
    })

    test("a game opened out → the list stays where it was scrolled, drawn once", () => {
        const { setup, screen, entries } = crowded()
        const scroll = screen.listScroll
        expect(scroll.overflows).toBe(true)
        scroll.offset = 40
        const before = scroll.content
        screen.setOpened(entries[5], true)
        setup.ui.render()
        expect(screen.isOpened(entries[5])).toBe(true)
        expect(screen.listScroll).toBe(scroll)
        expect(scroll.content).toBe(before)
        expect(scroll.offset).toBe(40)
        screen.setOpened(entries[5], false)
        setup.ui.render()
        expect(scroll.offset).toBe(40)
    })

    test("the order changed → the list is drawn again, its scroll the same", () => {
        const { setup, screen } = crowded()
        const scroll = screen.listScroll
        scroll.offset = 30
        screen.sort = "richest"
        screen.refresh()
        setup.ui.render()
        expect(screen.listScroll).toBe(scroll)
        expect(scroll.offset).toBe(30)
    })
})
