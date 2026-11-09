import { describe, expect, test } from "vitest"
import { Color, Dial } from "@game/core"

// --- Fixtures ---

const LOOK = { face: new Color(0, 0, 0), dot: new Color(1, 1, 1), needle: new Color(1, 1, 1) }

// --- Tests ---

describe("Dial", () => {
    test("fewer than two directions → refused", () => {
        expect(() => new Dial(1, LOOK)).toThrow()
        expect(() => new Dial(2.5, LOOK)).toThrow()
    })

    test("a point straight up, right, down, left → the first, a quarter, a half, three quarters", () => {
        const dial = new Dial(16, LOOK)
        expect(dial.stepAt(0, -10, 10)).toBe(0)
        expect(dial.stepAt(10, 0, 10)).toBe(4)
        expect(dial.stepAt(0, 10, 10)).toBe(8)
        expect(dial.stepAt(-10, 0, 10)).toBe(12)
    })

    test("a point just left of up → the last step, back around", () => {
        expect(new Dial(16, LOOK).stepAt(-1, -10, 10)).toBe(0)
        expect(new Dial(16, LOOK).stepAt(-4, -10, 10)).toBe(15)
    })

    test("eight directions → the diagonals fall on the even steps of sixteen", () => {
        const dial = new Dial(8, LOOK)
        expect(dial.stepAt(10, -10, 14)).toBe(1)
        expect(dial.stepAt(-10, 10, 14)).toBe(5)
    })

    test("the disc → its center and its edge are on it, past the edge is not", () => {
        const dial = new Dial(16, LOOK)
        expect(dial.contains(0, 0, 10)).toBe(true)
        expect(dial.contains(10, 0, 10)).toBe(true)
        expect(dial.contains(8, 8, 10)).toBe(false)
    })

    test("the center → no direction", () => {
        expect(new Dial(16, LOOK).stepAt(0.5, 0.5, 10)).toBeNull()
    })
})
