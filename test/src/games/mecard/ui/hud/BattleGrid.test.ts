import { describe, expect, test } from "vitest"
import { battleGrid, GAP, MARGIN } from "@game/core/mecard/battle-grid"
import type { BattleRows, UiRect } from "@game/core/mecard/battle-grid"

// --- Fixture builders ---

/** Rows as tall as what the battle screen shows in them. */
const ROWS: BattleRows = { chain: 60, hand: 62, info: 32 }

/** The sizes of the interface a screen may give. */
const SIZES = [[480, 270], [512, 288], [360, 270], [640, 360]] as const

function overlaps(a: UiRect, b: UiRect): boolean {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

// --- Tests ---

describe.each(SIZES)("battleGrid at %d by %d", (width, height) => {
    const grid = battleGrid(width, height, ROWS)
    const zones = Object.values(grid)

    test("no zone overlaps another", () => {
        zones.forEach((zone, index) => {
            for(const other of zones.slice(index + 1)) expect(overlaps(zone, other)).toBe(false)
        })
    })

    test("every zone lies inside the margins", () => {
        for(const zone of zones){
            expect(zone.left).toBeGreaterThanOrEqual(MARGIN)
            expect(zone.top).toBeGreaterThanOrEqual(MARGIN)
            expect(zone.right).toBeLessThanOrEqual(width - MARGIN)
            expect(zone.bottom).toBeLessThanOrEqual(height - MARGIN)
        }
    })

    test("the side columns are as wide", () => {
        expect(grid.stats.right - grid.stats.left).toBe(grid.units.right - grid.units.left)
    })

    test("the units end with the chain, and the decks start with the hand", () => {
        expect(grid.units.bottom).toBe(grid.chain.bottom)
        expect(grid.decks.top).toBe(grid.hand.top)
        expect(grid.decks.left).toBe(grid.units.left)
    })

    test("the journal starts with the chain and goes down to the bottom", () => {
        expect(grid.journal.top).toBe(grid.chain.top)
        expect(grid.journal.bottom).toBe(height - MARGIN)
    })

    test("the info lies under the hand and the decks", () => {
        expect(grid.info.left).toBe(grid.hand.left)
        expect(grid.info.right).toBe(grid.decks.right)
        expect(grid.info.top).toBe(grid.hand.bottom + GAP)
    })

    test("the rows under the map are as tall as they asked", () => {
        expect(grid.chain.bottom - grid.chain.top).toBe(ROWS.chain)
        expect(grid.hand.bottom - grid.hand.top).toBe(ROWS.hand)
        expect(grid.info.bottom - grid.info.top).toBe(ROWS.info)
    })
})

test("a screen too short leaves the map no room, not a negative one", () => {
    const { map } = battleGrid(480, 100, ROWS)
    expect(map.bottom).toBe(map.top)
})
