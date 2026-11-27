import { describe, expect, test } from "vitest"
import {
    ARENA_SIZE,
    hazardSpot,
    monsterSpot,
    monsterStart,
    partyStarts,
} from "@game/core-src/games/mecard/sim/run/formation"

// --- Tests ---

describe("partyStarts", () => {
    test("one character → in the middle of the bottom row", () => {
        const [start] = partyStarts(1)
        expect(start.x).toBeCloseTo(ARENA_SIZE / 2)
        expect(start.y).toBeCloseTo(7.5)
    })

    test("three characters → a centered row, two meters apart", () => {
        expect(partyStarts(3).map(start => [start.x, start.y])).toEqual([[2.5, 7.5], [4.5, 7.5], [6.5, 7.5]])
    })

    test("a fourth → a second row, above the first", () => {
        const [first, , , fourth] = partyStarts(4)
        expect(fourth.y).toBeCloseTo(first.y - 1)
        expect(fourth.x).toBeCloseTo(ARENA_SIZE / 2)
    })
})

describe("monsterStart", () => {
    test("monsters → every other meter along the top rows, from the second", () => {
        expect([0, 1, 2].map(index => monsterStart(index).x)).toEqual([2.5, 4.5, 6.5])
        expect(monsterStart(3).y).toBeGreaterThan(monsterStart(2).y)
    })
})

describe("hazardSpot", () => {
    test("a column and a row of the middle → the same grid as the monsters", () => {
        expect(hazardSpot(3, 0).equals(monsterSpot(3, 0))).toBe(true)
        expect(hazardSpot(3, 3).x).toBeCloseTo(4.5)
        expect(hazardSpot(3, 3).y).toBeCloseTo(4.5)
    })

    test("half a column → the edge between two spots", () => {
        expect(hazardSpot(2.5, 3).x).toBeCloseTo(4)
    })
})
