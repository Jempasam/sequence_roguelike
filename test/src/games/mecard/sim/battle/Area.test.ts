import { describe, expect, test } from "vitest"
import { Areas, UNIT_RADIUS, Vector2 } from "@game/core/mecard"
import type { Area } from "@game/core/mecard"

// --- Fixture builders ---

/** The slash of a unit at the origin facing up: 1,3 m, 60° on each side. */
const SLASH: Area = Areas.arc(Vector2.ZERO, Vector2.UP, 1.3, 0.5)

/** A point at a distance from the origin, an angle clockwise from up, in degrees. */
function at(distance: number, degrees: number): Vector2 {
    const angle = degrees * Math.PI / 180
    return new Vector2(Math.sin(angle), -Math.cos(angle)).times(distance)
}

// --- Tests ---

describe("checkCircle on an arc", () => {
    test("a body whose center lies outside its angle but overlapping its edge → touched", () => {
        expect(Areas.checkCircle(SLASH, at(1, 70), UNIT_RADIUS)).toBe(true)
        expect(Areas.checkCircle(SLASH, at(1, -70), UNIT_RADIUS)).toBe(true)
    })

    test("a body clear of its edges → not touched", () => {
        expect(Areas.checkCircle(SLASH, at(1, 90), UNIT_RADIUS)).toBe(false)
        expect(Areas.checkCircle(SLASH, at(1, 180), UNIT_RADIUS)).toBe(false)
    })

    test("a body touching its arc from beyond its radius → touched", () => {
        expect(Areas.checkCircle(SLASH, at(1.6, 0), UNIT_RADIUS)).toBe(true)
        expect(Areas.checkCircle(SLASH, at(1.75, 0), UNIT_RADIUS)).toBe(false)
    })

    test("a body over its center, whatever the angle → touched", () => {
        expect(Areas.checkCircle(SLASH, at(0.3, 180), UNIT_RADIUS)).toBe(true)
    })
})

describe("the shapes", () => {
    test("a circle → 32 points on its radius", () => {
        const center = new Vector2(1, 1)
        const points = Areas.circle(center, 2)
        expect(points).toHaveLength(32)
        for(const point of points) expect(point.distance(center)).toBeCloseTo(2)
    })

    test("CIRCLE has a radius of half a meter, SQUARE a side of one meter, around the origin", () => {
        for(const point of Areas.CIRCLE) expect(point.length).toBeCloseTo(0.5)
        expect(Areas.checkPoint(Areas.SQUARE, new Vector2(0.4, -0.4))).toBe(true)
        expect(Areas.checkPoint(Areas.SQUARE, new Vector2(0.6, 0))).toBe(false)
    })

    test("a square → as wide and high as asked around its center", () => {
        const square = Areas.square(new Vector2(5, 5), 2, 4)
        expect(Areas.checkPoint(square, new Vector2(6.9, 5.9))).toBe(true)
        expect(Areas.checkPoint(square, new Vector2(7.1, 5))).toBe(false)
        expect(Areas.checkPoint(square, new Vector2(5, 6.1))).toBe(false)
    })

    test("a line → a band of its width around the segment", () => {
        const band = Areas.line(new Vector2(0, 0), new Vector2(4, 0), 1)
        expect(Areas.checkPoint(band, new Vector2(2, 0.4))).toBe(true)
        expect(Areas.checkPoint(band, new Vector2(2, 0.6))).toBe(false)
    })

    test("an arc → its center, then its two edges at their angle", () => {
        expect(SLASH[0]).toEqual(Vector2.ZERO)
        expect(SLASH[1].distance(at(1.3, -60))).toBeCloseTo(0)
        expect(SLASH.at(-1)!.distance(at(1.3, 60))).toBeCloseTo(0)
    })
})

describe("move", () => {
    test("by default, it faces the top of the arena: only the center changes", () => {
        const moved = Areas.move(Areas.SQUARE, new Vector2(3, 3))
        expect(moved[0].distance(new Vector2(2.5, 2.5))).toBeCloseTo(0)
    })

    test("its top goes toward the forward, its right a quarter clockwise of it", () => {
        // 4 m wide along its right, 1 m high along its top.
        const band = Areas.square(Vector2.ZERO, 1, 4)
        // Facing right: the top goes to the arena's right, the right of the band to its bottom.
        const turned = Areas.move(band, Vector2.ZERO, Vector2.RIGHT)
        expect(Areas.checkPoint(turned, new Vector2(0, 1.9))).toBe(true)
        expect(Areas.checkPoint(turned, new Vector2(1.9, 0))).toBe(false)
    })

    test("a right given → used instead", () => {
        const sector = Areas.arc(Vector2.ZERO, Vector2.UP, 1, 0.5)
        const mirrored = Areas.move(sector, Vector2.ZERO, Vector2.UP, Vector2.LEFT)
        expect(mirrored).toHaveLength(sector.length)
        // The right being left mirrors the points across the vertical axis.
        expect(mirrored[1].distance(new Vector2(-sector[1].x, sector[1].y))).toBeCloseTo(0)
    })
})

describe("checks", () => {
    test("a point, inside or outside a crescent that is not convex", () => {
        const blade = Areas.crescent(Vector2.ZERO, Vector2.UP, 1, 2, 0.5)
        expect(Areas.checkPoint(blade, at(1.5, 0))).toBe(true)
        expect(Areas.checkPoint(blade, at(0.5, 0))).toBe(false)
    })

    test("a line, crossing an area, ending in it, or missing it → touched, touched, not", () => {
        const box = Areas.square(Vector2.ZERO, 2, 2)
        expect(Areas.checkLine(box, new Vector2(-3, 0), new Vector2(3, 0))).toBe(true)
        expect(Areas.checkLine(box, new Vector2(0, 0), new Vector2(0, 5))).toBe(true)
        expect(Areas.checkLine(box, new Vector2(-3, 3), new Vector2(3, 3))).toBe(false)
    })

    test("a line, wide enough to reach an area → touched", () => {
        const box = Areas.square(Vector2.ZERO, 2, 2)
        expect(Areas.checkLine(box, new Vector2(-3, 1.4), new Vector2(3, 1.4))).toBe(false)
        expect(Areas.checkLine(box, new Vector2(-3, 1.4), new Vector2(3, 1.4), 1)).toBe(true)
    })

    test("two areas, crossing, one in the other, or apart → overlap, overlap, not", () => {
        const first = Areas.square(Vector2.ZERO, 2, 2)
        expect(Areas.check(first, Areas.square(new Vector2(1.5, 0), 2, 2))).toBe(true)
        expect(Areas.check(first, Areas.square(Vector2.ZERO, 0.5, 0.5))).toBe(true)
        expect(Areas.check(first, Areas.square(new Vector2(5, 0), 2, 2))).toBe(false)
    })

    test("two areas that cross with no corner in the other → overlap", () => {
        const wide = Areas.square(Vector2.ZERO, 1, 6)
        const tall = Areas.square(Vector2.ZERO, 6, 1)
        expect(Areas.check(wide, tall)).toBe(true)
    })
})

describe("a crescent", () => {
    const blade = Areas.crescent(Vector2.ZERO, Vector2.UP, 1, 2, 0.5)

    test("a body under its blade, close to its center → not touched", () => {
        expect(Areas.checkCircle(blade, at(0.5, 0), UNIT_RADIUS)).toBe(false)
    })

    test("a body at its inner arc → touched", () => {
        expect(Areas.checkCircle(blade, at(0.9, 0), UNIT_RADIUS)).toBe(true)
    })

    test("a body behind it → not touched", () => {
        expect(Areas.checkCircle(blade, at(1.5, 180), UNIT_RADIUS)).toBe(false)
    })

    test("its outline starts from the middle of its outer arc, and goes around both arcs", () => {
        expect(blade[0].x).toBeCloseTo(0)
        expect(blade[0].y).toBeCloseTo(-2)
        const distances = blade.map(point => point.length)
        expect(Math.min(...distances)).toBeCloseTo(1)
        expect(Math.max(...distances)).toBeCloseTo(2)
    })
})
