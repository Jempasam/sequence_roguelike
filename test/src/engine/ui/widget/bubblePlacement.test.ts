import { describe, expect, test } from "vitest"
import { Rect, placeBubble } from "@game/core"

// --- Fixture builders ---

/** A screen 100 wide and 60 high, and a bubble 20 wide and 10 high. */
const ROOM = { width: 100, height: 60 }
const SIZE = { width: 20, height: 10 }

/** A point, which is a target of no size. */
function point(x: number, y: number): Rect {
    return new Rect(x, y, 0, 0)
}

// --- Tests ---

describe("placeBubble", () => {
    test("room under the target → the bubble opens under it, starting where it starts", () => {
        expect(placeBubble(SIZE, new Rect(10, 10, 30, 5), ROOM)).toEqual({ x: 10, y: 15, side: "below" })
    })

    test("a gap → it is left between the target and the bubble", () => {
        expect(placeBubble(SIZE, point(10, 10), ROOM, ["below"], 12)).toEqual({ x: 10, y: 22, side: "below" })
    })

    test("no room under the target → the bubble opens over it", () => {
        expect(placeBubble(SIZE, point(10, 55), ROOM)).toEqual({ x: 10, y: 45, side: "above" })
    })

    test("no room on the right → the bubble ends where the target ends", () => {
        expect(placeBubble(SIZE, new Rect(90, 10, 8, 5), ROOM)).toEqual({ x: 78, y: 15, side: "below" })
    })

    test("a point near the bottom right corner → the bubble opens over it, left of it", () => {
        expect(placeBubble(SIZE, point(95, 58), ROOM)).toEqual({ x: 75, y: 48, side: "above" })
    })

    test("the right wanted first and room there → the bubble opens beside the target", () => {
        const placed = placeBubble(SIZE, new Rect(10, 20, 8, 5), ROOM, ["right", "left"], 2)
        expect(placed).toEqual({ x: 20, y: 20, side: "right" })
    })

    test("no room on the right → the bubble opens on the left of the target", () => {
        const placed = placeBubble(SIZE, new Rect(85, 20, 10, 5), ROOM, ["right", "left"], 2)
        expect(placed).toEqual({ x: 63, y: 20, side: "left" })
    })

    test("a target low on the screen, the right wanted → the bubble ends where the target ends", () => {
        const placed = placeBubble(SIZE, new Rect(10, 55, 8, 4), ROOM, ["right"])
        expect(placed).toEqual({ x: 18, y: 49, side: "right" })
    })

    test("no side fits whole → the side with the most room, kept in the screen", () => {
        const placed = placeBubble({ width: 20, height: 50 }, point(50, 35), ROOM)
        expect(placed.side).toBe("above")
        expect(placed.y).toBe(0)
    })

    test("a bubble larger than the screen → kept at the origin", () => {
        const placed = placeBubble({ width: 200, height: 100 }, point(50, 30), ROOM)
        expect(placed).toMatchObject({ x: 0, y: 0 })
    })

    test("no side given → under, then over, as a menu opens", () => {
        expect(placeBubble(SIZE, point(10, 55), ROOM, [])).toEqual({ x: 10, y: 45, side: "above" })
    })

    test("a point near → the bubble is centered on it along the side, off the target", () => {
        const target = new Rect(10, 20, 80, 10)
        const placed = placeBubble(SIZE, target, ROOM, ["below", "above"], 2, { x: 60, y: 25 })
        expect(placed).toEqual({ x: 50, y: 32, side: "below" })
    })

    test("a point near and a bubble of an odd size → placed on whole pixels", () => {
        const target = new Rect(10, 20, 80, 10)
        const placed = placeBubble({ width: 21, height: 11 }, target, ROOM, ["below"], 2, { x: 60.5, y: 25 })
        expect(Number.isInteger(placed.x)).toBe(true)
        expect(Number.isInteger(placed.y)).toBe(true)
        expect(placed.x).toBe(50)
    })

    test("a point near the top of the target → the bubble opens over it, not under", () => {
        const target = new Rect(10, 15, 80, 25)
        const placed = placeBubble(SIZE, target, ROOM, ["below", "above"], 2, { x: 60, y: 16 })
        expect(placed).toEqual({ x: 50, y: 3, side: "above" })
    })

    test("a point near the right edge of a tall target → the bubble opens beside it, level with it", () => {
        const target = new Rect(10, 5, 60, 50)
        const sides = ["below", "above", "right", "left"] as const
        const placed = placeBubble(SIZE, target, ROOM, sides, 2, { x: 69, y: 30 })
        expect(placed).toEqual({ x: 72, y: 25, side: "right" })
    })

    test("two sides as close to the point → the first given is taken", () => {
        const target = new Rect(10, 25, 80, 10)
        const placed = placeBubble(SIZE, target, ROOM, ["below", "above"], 0, { x: 50, y: 30 })
        expect(placed.side).toBe("below")
    })

    test("a point near the border of the room → the bubble is kept in the room along the side", () => {
        const target = new Rect(0, 20, 100, 10)
        const placed = placeBubble(SIZE, target, ROOM, ["below"], 0, { x: 99, y: 25 })
        expect(placed).toEqual({ x: 80, y: 30, side: "below" })
    })

    test("a point near and no side fits whole → the side with the most room, kept in the screen", () => {
        const tall = { width: 20, height: 50 }
        const placed = placeBubble(tall, new Rect(40, 30, 20, 10), ROOM, ["below", "above"], 0, { x: 50, y: 35 })
        expect(placed.side).toBe("above")
        expect(placed.y).toBe(0)
    })
})
