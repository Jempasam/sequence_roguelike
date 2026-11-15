import { describe, expect, test } from "vitest"
import { BASE_ELEMENTS, COMPOUNDS } from "@game/core/mecard"
import { colorGap, colorsDistinct, MIN_COLOR_GAP } from "@game/core/mecard/color-gap"
import type { TextColor } from "@game/core"

// --- Fixture builders ---

/** The color of an element, as a text names it. */
function colorOf(element: { readonly color: { r: number, g: number, b: number, a: number } }): TextColor {
    const { r, g, b, a } = element.color
    return [r, g, b, a]
}

// --- Tests ---

describe("colorGap", () => {
    test("the same color → no gap; black and white → a wide one", () => {
        expect(colorGap([0.2, 0.4, 0.6], [0.2, 0.4, 0.6])).toBe(0)
        expect(colorGap([0, 0, 0], [1, 1, 1])).toBeGreaterThan(2.5)
    })

    test("symmetric", () => {
        expect(colorGap([1, 0, 0], [0, 0, 1])).toBeCloseTo(colorGap([0, 0, 1], [1, 0, 0]))
    })

    test("a color with some alpha → seen over the card, so two clear ones come near each other", () => {
        expect(colorGap([1, 0, 0, 0.1], [0, 0, 1, 0.1])).toBeLessThan(colorGap([1, 0, 0], [0, 0, 1]))
    })
})

describe("colorsDistinct", () => {
    test("the base elements → far enough apart to be told by their colors alone", () => {
        const colors = BASE_ELEMENTS.map(colorOf)
        const gaps: number[] = []
        colors.forEach((one, index) => colors.slice(index + 1).forEach(other => gaps.push(colorGap(one, other))))
        expect(Math.min(...gaps)).toBeGreaterThanOrEqual(MIN_COLOR_GAP)
        expect(colorsDistinct(colors)).toBe(true)
    })

    test("two near colors among the compounds → not distinct", () => {
        const steam = COMPOUNDS.find(compound => compound.name === "Vapeur")!
        const mist = COMPOUNDS.find(compound => compound.name === "Brume")!
        expect(colorsDistinct([colorOf(steam), colorOf(mist)])).toBe(false)
    })

    test("none or one color → distinct", () => {
        expect(colorsDistinct([])).toBe(true)
        expect(colorsDistinct([[1, 0, 0]])).toBe(true)
    })
})
