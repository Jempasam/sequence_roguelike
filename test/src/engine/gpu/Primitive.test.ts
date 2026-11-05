import { describe, expect, test } from "vitest"
import { Primitive } from "@game/core"

// --- Tests ---

describe("Primitive.countOf", () => {
    test("5 vertices of TRIANGLE_STRIP → 3 triangles", () => {
        expect(Primitive.TRIANGLE_STRIP.countOf(5)).toBe(3)
    })

    test("2 vertices of TRIANGLES → none", () => {
        expect(Primitive.TRIANGLES.countOf(2)).toBe(0)
    })
})

describe("Primitive.fits", () => {
    test("7 vertices of TRIANGLES → leftover", () => {
        expect(Primitive.TRIANGLES.fits(7)).toBe(false)
    })

    test("7 vertices of TRIANGLE_FAN → fits", () => {
        expect(Primitive.TRIANGLE_FAN.fits(7)).toBe(true)
    })

    test("no vertex → fits", () => {
        expect(Primitive.LINES.fits(0)).toBe(true)
    })
})

describe("Primitive.list", () => {
    test("strip, fan → TRIANGLES; loop, strip of lines → LINES; lists → themselves", () => {
        expect(Primitive.TRIANGLE_STRIP.list).toBe(Primitive.TRIANGLES)
        expect(Primitive.TRIANGLE_FAN.list).toBe(Primitive.TRIANGLES)
        expect(Primitive.LINE_LOOP.list).toBe(Primitive.LINES)
        expect(Primitive.LINE_STRIP.list).toBe(Primitive.LINES)
        expect(Primitive.POINTS.list).toBe(Primitive.POINTS)
        expect(Primitive.TRIANGLES.isIndependent).toBe(true)
        expect(Primitive.TRIANGLE_STRIP.isIndependent).toBe(false)
    })
})
