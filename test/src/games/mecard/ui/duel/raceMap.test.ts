import { describe, expect, test } from "vitest"
import type { Progress } from "@game/core/mecard/sync"
import { floorTicks, mapPosition, mapScale, scaleRatio } from "@game/core/mecard/duel-map"
import { COLUMN_CARD_MAX, friezeCards, friezeHit, friezeMarks } from "@game/core/mecard/duel-frieze"
import type { FriezeEntry } from "@game/core/mecard/duel-frieze"
import { Color } from "@game/core"

/** The progress of a player on a floor, with the row it stands on and the rows of the floor. */
function at(floor: number, layer: number, rows: number): Progress {
    return { floor, depth: 0, layer, rows, atDuel: false, inBattle: false, inHalt: false }
}

describe("mapPosition", () => {
    test("floors left behind, plus how far on the floor → in floors", () => {
        expect(mapPosition(at(3, 4, 10))).toBe(2.5)
        expect(mapPosition(at(1, -1, 10))).toBe(0)
        expect(mapPosition(at(1, 9, 10))).toBe(1)
    })

    test("rows unknown → the start of the floor", () => {
        expect(mapPosition(at(2, 5, 0))).toBe(1)
    })
})

describe("mapScale", () => {
    test("a map of a known end → the whole of it, from the start", () => {
        expect(mapScale([0.2, 0.8], 1)).toEqual({ start: 0, span: 1, whole: true })
    })

    test("a map without end → a window from the floor of the player furthest behind, which slides", () => {
        expect(mapScale([2.4, 5], null)).toMatchObject({ start: 2, span: 3, whole: false })
        expect(mapScale([3.1, 5], null)).toMatchObject({ start: 3 })
    })

    test("a position outside → at the nearest end", () => {
        const scale = mapScale([2.4], null)
        expect(scaleRatio(9, scale)).toBe(1)
        expect(scaleRatio(0, scale)).toBe(0)
        expect(scaleRatio(3.5, scale)).toBeCloseTo(0.5)
    })

    test("limits between floors → the shares of the scale, its ends left out", () => {
        expect(floorTicks({ start: 2, span: 3, whole: false })).toEqual([1 / 3, 2 / 3])
        expect(floorTicks({ start: 0, span: 1, whole: true })).toEqual([])
    })
})

describe("frieze", () => {
    const entry = (id: string, ratio: number): FriezeEntry =>
        ({ id, color: new Color(0, 0, 0), ratio, top: "", bottom: "" })
    const box = { width: 132, height: 40, top: 0, bottom: 0 }

    test("columns → a frame each, no wider than the maximum, the group centered", () => {
        const cards = friezeCards("columns", 3, 132)
        expect(cards).toHaveLength(3)
        expect(cards.every(card => card.width <= COLUMN_CARD_MAX)).toBe(true)
        const left = cards[0].x
        const right = 132 - (cards[2].x + cards[2].width)
        expect(Math.abs(left - right)).toBeLessThanOrEqual(1)
    })

    test("a pointer over the frame of a column → that player, and none beside", () => {
        const entries = [entry("a", 0), entry("b", 0.5)]
        const cards = friezeCards("columns", 2, box.width)
        expect(friezeHit("columns", entries, box, cards[1].x + 2, 10)).toBe("b")
        expect(friezeHit("columns", entries, box, 0, 10)).toBeNull()
    })

    test("the track → a dot on its line by its ratio, and one over the other lie apart", () => {
        const marks = friezeMarks("track", [entry("a", 0.5), entry("b", 0.5)], box)
        expect(marks[0].x).toBe(marks[1].x)
        expect(marks[0].y).not.toBe(marks[1].y)
    })
})
