import { describe, expect, test } from "vitest"
import { Areas, Box, Disk, Vector2 } from "@game/core/mecard"
import { MIN_SPREAD, PROFILE_RAYS, placeStrike } from "@game/core/mecard/place-strike"

// --- Fixture builders ---

const ORIGIN = new Vector2(5, 5)

/** The cosine of half an angle, from the angle in degrees. */
function cosHalf(degrees: number): number {
    return Math.cos(degrees / 2 * Math.PI / 180)
}

// --- Tests ---

describe("placeStrike", () => {
    test("an arc of 120 degrees ahead → reach at its radius, a spread of 60 degrees, a blade from the origin", () => {
        const placed = placeStrike(Areas.arc(ORIGIN, Vector2.RIGHT, 2, cosHalf(120)), ORIGIN, Vector2.RIGHT)
        expect(placed.rotation).toBeCloseTo(0)
        expect(placed.reach).toBeCloseTo(2, 1)
        expect(placed.spread).toBeCloseTo(Math.PI / 3, 1)
        expect(placed.profile).toHaveLength(PROFILE_RAYS)
        for(const cut of placed.profile){
            expect(cut).not.toBeNull()
            expect(cut!.inner).toBeCloseTo(0)
            expect(cut!.outer).toBeGreaterThan(1)
        }
    })

    test("the same arc turned down → the same measures, the rotation following", () => {
        const right = placeStrike(Areas.arc(ORIGIN, Vector2.RIGHT, 2, cosHalf(120)), ORIGIN, Vector2.RIGHT)
        const down = placeStrike(Areas.arc(ORIGIN, Vector2.DOWN, 2, cosHalf(120)), ORIGIN, Vector2.DOWN)
        expect(down.rotation).toBeCloseTo(Math.PI / 2)
        expect(down.reach).toBeCloseTo(right.reach, 5)
        expect(down.halfWidth).toBeCloseTo(right.halfWidth, 5)
        expect(down.spread).toBeCloseTo(right.spread, 5)
    })

    test("a blow behind the attacker → turned toward its area, not where the attacker looks", () => {
        const placed = placeStrike(Areas.arc(ORIGIN, Vector2.LEFT, 2, cosHalf(120)), ORIGIN, Vector2.RIGHT)
        expect(Math.abs(placed.rotation)).toBeCloseTo(Math.PI)
        expect(placed.reach).toBeCloseTo(2, 1)
    })

    test("a crescent → a blade starting away from the origin, ending at its radius", () => {
        const area = Areas.crescent(ORIGIN, Vector2.RIGHT, 1, 2, cosHalf(90))
        const placed = placeStrike(area, ORIGIN, Vector2.RIGHT)
        const middle = placed.profile[Math.floor(PROFILE_RAYS / 2)]!
        expect(middle.inner).toBeGreaterThan(0.5)
        expect(middle.outer).toBeGreaterThan(middle.inner)
        expect(middle.outer).toBeLessThanOrEqual(2.01)
    })

    test("a circle around the attacker → a full turn, the blade starting at the origin", () => {
        const placed = placeStrike(Areas.circle(ORIGIN, 1.5), ORIGIN, Vector2.UP)
        expect(placed.spread).toBeCloseTo(Math.PI)
        for(const cut of placed.profile){
            expect(cut).not.toBeNull()
            expect(cut!.inner).toBe(0)
            expect(cut!.outer).toBeCloseTo(1.5, 1)
        }
    })

    test("a circle ahead of the attacker → the blade starts at its near edge and ends at its far edge", () => {
        const placed = placeStrike(Areas.circle(new Vector2(7, 5), 1), ORIGIN, Vector2.RIGHT)
        const middle = placed.profile[Math.floor(PROFILE_RAYS / 2)]!
        expect(placed.rotation).toBeCloseTo(0)
        expect(placed.spread).toBeLessThan(Math.PI / 4)
        expect(middle.inner).toBeCloseTo(1, 1)
        expect(middle.outer).toBeCloseTo(3, 1)
    })

    test("a line → a narrow spread, a reach of its length, half its width to either side", () => {
        const placed = placeStrike(Areas.line(ORIGIN, new Vector2(8, 5), 1), ORIGIN, Vector2.RIGHT)
        expect(placed.spread).toBeLessThan(0.3)
        expect(placed.spread).toBeGreaterThan(MIN_SPREAD)
        expect(placed.reach).toBeGreaterThanOrEqual(3)
        expect(placed.halfWidth).toBeCloseTo(0.5, 1)
    })

    test("a ray missing the area → no cut at that angle", () => {
        const narrow = Areas.line(new Vector2(6, 5), new Vector2(8, 5), 0.2)
        const wide = [...narrow, new Vector2(6, 9)]
        const placed = placeStrike(wide, ORIGIN, Vector2.RIGHT)
        expect(placed.profile.some(cut => cut === null)).toBe(true)
        expect(placed.profile.some(cut => cut !== null)).toBe(true)
    })

    test("a target hitbox → an impact scaled by its reach over the base unit, 1 with none", () => {
        const area = Areas.circle(ORIGIN, 1)
        expect(placeStrike(area, ORIGIN, Vector2.UP).impactScale).toBe(1)
        const small = placeStrike(area, ORIGIN, Vector2.UP, new Disk(0.35)).impactScale
        const big = placeStrike(area, ORIGIN, Vector2.UP, new Disk(0.7)).impactScale
        expect(small).toBeCloseTo(1)
        expect(big).toBeCloseTo(2)
        expect(placeStrike(area, ORIGIN, Vector2.UP, new Box(1, 1)).impactScale).toBeGreaterThan(1)
    })

    test("an empty area → a minimal placement, no cut", () => {
        const placed = placeStrike([], ORIGIN, Vector2.UP)
        expect(placed.reach).toBeGreaterThan(0)
        expect(placed.halfWidth).toBeGreaterThan(0)
        expect(placed.profile.every(cut => cut === null)).toBe(true)
    })
})
