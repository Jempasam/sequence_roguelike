import { describe, expect, test } from "vitest"
import { Color, contrastRatio, luminance, MIN_CONTRAST, outlineAgainst } from "@game/core"

// --- Fixture builders ---

const WHITE = new Color(1, 1, 1)
const BLACK = new Color(0, 0, 0)
const PAPER = new Color(0.89, 0.82, 0.65)
const INK = new Color(0.05, 0.03, 0.02)
const NIGHT = new Color(0.08, 0.06, 0.1)

// --- Tests ---

describe("contrastRatio", () => {
    test("black over white → 21, the most", () => {
        expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 5)
    })

    test("a color with itself → 1, the least", () => {
        expect(contrastRatio(PAPER, PAPER)).toBe(1)
    })

    test("the colors in the other order → the same ratio", () => {
        expect(contrastRatio(INK, PAPER)).toBe(contrastRatio(PAPER, INK))
    })

    test("a color as the channels a text names → read as the same color", () => {
        expect(contrastRatio([1, 1, 1], BLACK)).toBeCloseTo(21, 5)
        expect(luminance([0.89, 0.82, 0.65, 0.5])).toBe(luminance(PAPER))
    })
})

describe("outlineAgainst", () => {
    test("white text on a light paper → a black outline", () => {
        const outline = outlineAgainst(WHITE, PAPER)
        expect(outline).not.toBeNull()
        expect(outline!.r + outline!.g + outline!.b).toBe(0)
    })

    test("dark ink on a light paper → none, it tells apart already", () => {
        expect(outlineAgainst(INK, PAPER)).toBeNull()
    })

    test("dark text on a dark background → a white outline", () => {
        const outline = outlineAgainst(new Color(0.12, 0.1, 0.14), NIGHT)
        expect(outline).not.toBeNull()
        expect(outline!.r).toBe(1)
    })

    test("a contrast just under the minimum → outlined, just over → not", () => {
        const gray = (level: number) => new Color(level, level, level)
        const under = outlineAgainst(gray(0.5), gray(0.62))
        expect(contrastRatio(gray(0.5), gray(0.62))).toBeLessThan(MIN_CONTRAST)
        expect(under).not.toBeNull()
        expect(outlineAgainst(WHITE, BLACK)).toBeNull()
    })

    test("a lower minimum → a color is outlined less often", () => {
        expect(outlineAgainst(WHITE, PAPER, 1.2)).toBeNull()
    })
})
