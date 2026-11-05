import { describe, expect, test } from "vitest"
import { svgContours } from "@game/core"

// --- Tests ---

describe("svgContours", () => {
    test("absolute commands → the points of a closed contour", () => {
        expect(svgContours("M0 0 L4 0 V4 H0 Z", 4)).toEqual([
            [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }],
        ])
    })

    test("relative commands, numbers repeating a move → lines from the last point", () => {
        expect(svgContours("m1 1 2 0 0 2z", 4)).toEqual([[{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }]])
    })

    test("two moves → two contours", () => {
        expect(svgContours("M0 0 L1 0 L0 1 Z M5 5 L6 5 L5 6 Z", 8)).toHaveLength(2)
    })

    test("cubic → cut into sides, ending on its end, through its middle", () => {
        const [contour] = svgContours("M0 0 C0 4 4 4 4 0", 4)
        expect(contour.length).toBeGreaterThan(4)
        expect(contour.at(-1)).toEqual({ x: 4, y: 0 })
        expect(contour.some(p => Math.abs(p.x - 2) < 1e-9 && Math.abs(p.y - 3) < 1e-9)).toBe(true)
    })

    test("smooth quadratic → the control point mirrored", () => {
        const [contour] = svgContours("M0 0 Q1 2 2 0 T4 0", 4)
        expect(Math.min(...contour.map(p => p.y))).toBeCloseTo(-1)
        expect(contour.at(-1)).toEqual({ x: 4, y: 0 })
    })

    test("half circle arc → its points on the circle, on the side the sweep says", () => {
        const [contour] = svgContours("M0 0 A1 1 0 0 1 2 0", 2)
        for(const p of contour) expect(Math.hypot(p.x - 1, p.y)).toBeCloseTo(1)
        expect(Math.min(...contour.map(p => p.y))).toBeCloseTo(-1)
    })

    test("radius too small → grown until the arc reaches", () => {
        const [contour] = svgContours("M0 0 A0.1 0.1 0 0 0 2 0", 2)
        expect(Math.max(...contour.map(p => p.y))).toBeCloseTo(1)
    })

    test("an unknown command → an error", () => {
        expect(() => svgContours("M0 0 X1 1", 1)).toThrow(/unknown command/)
    })
})
