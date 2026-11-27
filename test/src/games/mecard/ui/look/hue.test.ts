import { describe, expect, test } from "vitest"
import { Color } from "@game/core-src/engine/math"
import { colorOfHue, hueOf } from "@game/core/mecard/hue"

const TURN = 2 * Math.PI

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
