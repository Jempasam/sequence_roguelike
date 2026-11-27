import { describe, expect, test } from "vitest"
import { Color } from "@game/core-src/engine/math"
import { averageColor, colorOfHue, hueOf, mixHues } from "@game/core/mecard/hue"

const TURN = 2 * Math.PI

/** The pixels of an image from its RGBA texels. */
function image(...texels: readonly (readonly [number, number, number, number])[]) {
    return { width: texels.length, height: 1, data: new Uint8Array(texels.flat()) }
}

describe("hueOf", () => {
    test("red, green, blue → 0, a third and two thirds of a turn", () => {
        expect(hueOf(new Color(1, 0, 0))).toBeCloseTo(0)
        expect(hueOf(new Color(0, 1, 0))).toBeCloseTo(TURN / 3)
        expect(hueOf(new Color(0, 0, 1))).toBeCloseTo(TURN * 2 / 3)
    })

    test("a grey → no hue", () => {
        expect(hueOf(new Color(0.4, 0.4, 0.4))).toBeNull()
    })

    test("a dark color → its hue all the same", () => {
        expect(hueOf(new Color(0.1, 0.05, 0.05))).toBeCloseTo(0)
    })
})

describe("colorOfHue", () => {
    test.each([0, 1, 2, 3, 4, 5])("hue %i sixths of a turn → a color whose hue it is", sixth => {
        const hue = sixth * TURN / 6
        expect(hueOf(colorOfHue(hue))).toBeCloseTo(hue)
    })
})

describe("mixHues", () => {
    test("red and green → yellow", () => {
        expect(hueOf(mixHues(new Color(1, 0, 0), new Color(0, 1, 0)))).toBeCloseTo(TURN / 6)
    })

    test("across the start of the turn → the shorter way", () => {
        const mixed = hueOf(mixHues(new Color(1, 0, 0.2), new Color(1, 0.2, 0)))
        expect(Math.min(mixed ?? 1, TURN - (mixed ?? 0))).toBeLessThan(0.2)
    })

    test("a hue with itself → itself", () => {
        const blue = new Color(0, 0.3, 1)
        expect(hueOf(mixHues(blue, new Color(0, 0.3, 1)))).toBeCloseTo(hueOf(blue)!)
    })

    test("a grey or the opposite hue → the first color", () => {
        const red = new Color(1, 0, 0)
        expect(mixHues(red, new Color(0.5, 0.5, 0.5))).toBe(red)
        expect(mixHues(red, new Color(0, 1, 1))).toBe(red)
    })
})

describe("averageColor", () => {
    test("pixels of different opacity → weighted by it", () => {
        const mean = averageColor(image([255, 0, 0, 255], [0, 0, 255, 85]))
        expect(mean.r).toBeCloseTo(0.75)
        expect(mean.b).toBeCloseTo(0.25)
    })

    test("a transparent pixel → ignored", () => {
        const mean = averageColor(image([0, 255, 0, 255], [255, 0, 0, 0]))
        expect(mean.g).toBeCloseTo(1)
        expect(mean.r).toBeCloseTo(0)
    })

    test("nothing opaque → white", () => {
        expect(averageColor(image([10, 20, 30, 0]))).toEqual(new Color(1, 1, 1))
    })
})
