import { describe, expect, test } from "vitest"
import { outline, touches, UNIT_RADIUS, Vector2 } from "@game/core/mecard"
import type { Area } from "@game/core/mecard"

// --- Fixture builders ---

/** The slash of a unit at the origin facing up: 1,3 m, 60° on each side. */
const SLASH: Area = { kind: "sector", center: Vector2.ZERO, direction: Vector2.UP, radius: 1.3, cosHalf: 0.5 }

/** A point at a distance from the origin, an angle clockwise from up, in degrees. */
function at(distance: number, degrees: number): Vector2 {
    const angle = degrees * Math.PI / 180
    return new Vector2(Math.sin(angle), -Math.cos(angle)).times(distance)
}

// --- Tests ---

describe("touches", () => {
    test("a sector, a body whose center lies outside its angle but overlapping its edge → touched", () => {
        expect(touches(SLASH, at(1, 70), UNIT_RADIUS)).toBe(true)
        expect(touches(SLASH, at(1, -70), UNIT_RADIUS)).toBe(true)
    })

    test("a sector, a body clear of its edges → not touched", () => {
        expect(touches(SLASH, at(1, 90), UNIT_RADIUS)).toBe(false)
        expect(touches(SLASH, at(1, 180), UNIT_RADIUS)).toBe(false)
    })

    test("a sector, a body touching its arc from beyond its radius → touched", () => {
        expect(touches(SLASH, at(1.6, 0), UNIT_RADIUS)).toBe(true)
        expect(touches(SLASH, at(1.7, 0), UNIT_RADIUS)).toBe(false)
    })

    test("a sector, a body over its center, whatever the angle → touched", () => {
        expect(touches(SLASH, at(0.3, 180), UNIT_RADIUS)).toBe(true)
    })
})

describe("outline", () => {
    test("a circle → 16 points on its radius", () => {
        const points = outline({ kind: "circle", center: new Vector2(1, 1), radius: 2 })
        expect(points).toHaveLength(16)
        for(const point of points) expect(point.distance(new Vector2(1, 1))).toBeCloseTo(2)
    })

    test("a sector → its center, then its two edges at their angle", () => {
        const points = outline(SLASH)
        expect(points[0]).toEqual(Vector2.ZERO)
        expect(points[1].distance(at(1.3, -60))).toBeCloseTo(0)
        expect(points.at(-1)!.distance(at(1.3, 60))).toBeCloseTo(0)
    })
})

describe("a crescent", () => {
    const blade: Area = {
        kind: "crescent", center: Vector2.ZERO, direction: Vector2.UP, inner: 1, radius: 2, cosHalf: 0.5,
    }

    test("a body under its blade, close to its center → not touched", () => {
        expect(touches(blade, at(0.5, 0), UNIT_RADIUS)).toBe(false)
    })

    test("a body at its inner arc → touched", () => {
        expect(touches(blade, at(0.9, 0), UNIT_RADIUS)).toBe(true)
    })

    test("a body behind it → not touched", () => {
        expect(touches(blade, at(1.5, 180), UNIT_RADIUS)).toBe(false)
    })

    test("its outline starts from the middle of its outer arc, and goes around both arcs", () => {
        const points = outline(blade)
        expect(points[0].x).toBeCloseTo(0)
        expect(points[0].y).toBeCloseTo(-2)
        const distances = points.map(point => point.length)
        expect(Math.min(...distances)).toBeCloseTo(1)
        expect(Math.max(...distances)).toBeCloseTo(2)
    })
})
