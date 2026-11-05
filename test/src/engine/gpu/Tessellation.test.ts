import { describe, expect, test } from "vitest"
import { arcShape, curveSegmentsOf, multiLineShape, polygonShape, Shape, thickLineShape } from "@game/core"

// --- Fixture builders ---

function rounded(values: readonly number[]): number[] {
    return values.map(value => Math.round(value * 1e6) / 1e6 + 0)
}

/** The total area of the triangles of a shape, overlaps counted twice. */
function areaOf(shape: Shape): number {
    const p = shape.positions
    let area = 0
    for(let i = 0; i < shape.indices.length; i += 3){
        const [a, b, c] = [shape.indices[i], shape.indices[i + 1], shape.indices[i + 2]].map(k => k * 2)
        area += Math.abs((p[b] - p[a]) * (p[c + 1] - p[a + 1]) - (p[c] - p[a]) * (p[b + 1] - p[a + 1])) / 2
    }
    return area
}

// --- Tests ---

describe("thickLineShape", () => {
    test("horizontal segment → a quad of its thickness", () => {
        const shape = new Shape()
        thickLineShape(shape, { x: 0, y: 0 }, { x: 10, y: 0 }, 2)
        expect(rounded(shape.positions)).toEqual([0, 1, 10, 1, 10, -1, 0, -1])
        expect(areaOf(shape)).toBeCloseTo(20)
    })

    test("same two points → nothing", () => {
        const shape = new Shape()
        thickLineShape(shape, { x: 3, y: 3 }, { x: 3, y: 3 }, 2)
        expect(shape.indices).toEqual([])
    })
})

describe("polygonShape", () => {
    test("square → 2 triangles of its area", () => {
        const shape = new Shape()
        polygonShape(shape, [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }])
        expect(shape.indices).toHaveLength(6)
        expect(areaOf(shape)).toBeCloseTo(16)
    })

    test("concave L, either way round → its area, nothing outside", () => {
        const corners = [
            { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 4, y: 2 }, { x: 4, y: 4 }, { x: 0, y: 4 },
        ]
        for(const points of [corners, [...corners].reverse()]){
            const shape = new Shape()
            polygonShape(shape, points)
            expect(areaOf(shape)).toBeCloseTo(12)
        }
    })

    test("a corner on a straight edge → skipped, the area kept", () => {
        const shape = new Shape()
        polygonShape(shape, [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }])
        expect(areaOf(shape)).toBeCloseTo(16)
    })

    test("fewer than 3 corners → nothing", () => {
        const shape = new Shape()
        polygonShape(shape, [{ x: 0, y: 0 }, { x: 4, y: 0 }])
        expect(shape.indices).toEqual([])
    })
})

describe("multiLineShape", () => {
    test("right angle → mitered, covering both segments and the corner", () => {
        const shape = new Shape()
        multiLineShape(shape, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 2, false)
        // An L of an 11 × 2 bar and a 2 × 9 bar, which the mitered segments cover without overlapping.
        expect(areaOf(shape)).toBeCloseTo(40)
    })

    test("acute angle beyond the miter limit → beveled", () => {
        const shape = new Shape()
        multiLineShape(shape, [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 1 }], 2, false)
        const farthest = Math.max(...shape.positions.filter((_, i) => i % 2 === 0))
        expect(farthest).toBeLessThan(12)
    })

    test("repeated points → skipped", () => {
        const once = new Shape()
        const repeated = new Shape()
        multiLineShape(once, [{ x: 0, y: 0 }, { x: 10, y: 0 }], 2, false)
        multiLineShape(repeated, [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }], 2, false)
        expect(repeated.positions).toEqual(once.positions)
    })

    test("closed square → four segments", () => {
        const shape = new Shape()
        const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]
        multiLineShape(shape, square, 2, true)
        expect(shape.indices.length).toBe(4 * 6)
        // A ring between a 12 × 12 and an 8 × 8 square.
        expect(areaOf(shape)).toBeCloseTo(144 - 64)
    })

    test("one point → nothing", () => {
        const shape = new Shape()
        multiLineShape(shape, [{ x: 1, y: 1 }], 2, false)
        expect(shape.indices).toEqual([])
    })
})

describe("arcShape", () => {
    test("full circle → as many triangles as segments, area close to πr²", () => {
        const shape = new Shape()
        const segments = curveSegmentsOf(50, 2 * Math.PI)
        arcShape(shape, 0, 0, 50, 0, 2 * Math.PI, segments)
        expect(shape.indices.length).toBe(segments * 3)
        expect(areaOf(shape) / (Math.PI * 2500)).toBeGreaterThan(0.99)
    })

    test("half turn → half the disk", () => {
        const shape = new Shape()
        arcShape(shape, 0, 0, 50, 0, Math.PI, curveSegmentsOf(50, Math.PI))
        expect(areaOf(shape) / (Math.PI * 2500 / 2)).toBeGreaterThan(0.99)
    })
})

describe("curveSegmentsOf", () => {
    test("tiny circle → still 8 sides", () => {
        expect(curveSegmentsOf(0.5, 2 * Math.PI)).toBe(8)
    })

    test("huge circle → capped", () => {
        expect(curveSegmentsOf(1e6, 2 * Math.PI)).toBe(256)
    })
})
