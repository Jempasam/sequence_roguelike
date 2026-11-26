import { describe, expect, test } from "vitest"
import { Areas, Vector2 } from "@game/core/mecard"
import { defaultAnimation, readAnimation } from "@game/core/mecard/fx-animation"
import { eased, fadeOf, frameOf, impactDrawing, strikeDrawings } from "@game/core/mecard/fx-drawings"
import { placeStrike } from "@game/core/mecard/place-strike"

// --- Fixture builders ---

const ORIGIN = new Vector2(5, 5)
const FRAME = { width: 16, height: 8 }

/** The placement of an arc of 120 degrees and 2 meters ahead of the origin, turned to the right. */
function slash() {
    return placeStrike(Areas.arc(ORIGIN, Vector2.RIGHT, 2, 0.5), ORIGIN, Vector2.RIGHT)
}

// --- Tests ---

describe("strikeDrawings, the sweep", () => {
    const sweep = defaultAnimation("sweep")

    test("the start → the blade at one side of the area, the end → at the other", () => {
        const start = strikeDrawings({ ...sweep, ease: "linear" }, slash(), FRAME, 0)![0]
        const end = strikeDrawings({ ...sweep, ease: "linear" }, slash(), FRAME, 1)![0]
        expect(start.angle).toBeLessThan(0)
        expect(end.angle).toBeGreaterThan(0)
        expect(start.angle).toBeCloseTo(-end.angle, 1)
    })

    test("any moment → the blade starts at the origin of an arc and ends at its edge", () => {
        const middle = strikeDrawings(sweep, slash(), FRAME, 0.5)![0]
        expect(middle.x).toBeCloseTo(ORIGIN.x)
        expect(middle.y).toBeCloseTo(ORIGIN.y)
        expect(middle.length).toBeGreaterThan(1.5)
    })

    test("a trail → one more drawing for each copy, the older fainter", () => {
        const drawings = strikeDrawings({ ...sweep, trail: 2 }, slash(), FRAME, 0.8)!
        expect(drawings).toHaveLength(3)
        expect(drawings[0].alpha).toBeGreaterThan(drawings[1].alpha)
        expect(drawings[1].alpha).toBeGreaterThan(drawings[2].alpha)
    })

    test("a flip with a blow toward the left → mirrored", () => {
        const left = placeStrike(Areas.arc(ORIGIN, Vector2.LEFT, 2, 0.5), ORIGIN, Vector2.LEFT)
        expect(strikeDrawings({ ...sweep, flip: true }, left, FRAME, 0.5)![0].width).toBeLessThan(0)
        expect(strikeDrawings({ ...sweep, flip: true }, slash(), FRAME, 0.5)![0].width).toBeGreaterThan(0)
    })

    test("a rain → a fall for each count once it started, landing inside the area", () => {
        const rain = { ...defaultAnimation("rain"), ease: "linear" as const, count: 4 }
        expect(strikeDrawings(rain, slash(), FRAME, 0.05)!.length).toBeLessThan(4)
        const landed = strikeDrawings(rain, slash(), FRAME, 1, 7)!
        expect(landed).toHaveLength(4)
        const area = Areas.arc(ORIGIN, Vector2.RIGHT, 2.1, 0.5)
        for(const fall of landed) expect(Areas.checkPoint(area, new Vector2(fall.x, fall.y))).toBe(true)
    })

    test("a rain → the same for a seed, otherwise for another", () => {
        const rain = { ...defaultAnimation("rain"), ease: "linear" as const }
        const one = strikeDrawings(rain, slash(), FRAME, 1, 3)
        expect(strikeDrawings(rain, slash(), FRAME, 1, 3)).toEqual(one)
        expect(strikeDrawings(rain, slash(), FRAME, 1, 4)).not.toEqual(one)
    })

    test("a bolt → a segment for each count, from the attacker to the end of the area, kinked in between", () => {
        const bolt = { ...defaultAnimation("bolt"), ease: "linear" as const, count: 5 }
        const drawings = strikeDrawings(bolt, slash(), FRAME, 0.2, 1)!
        expect(drawings).toHaveLength(5)
        expect(drawings[0].x).toBeCloseTo(ORIGIN.x)
        expect(drawings[0].y).toBeCloseTo(ORIGIN.y)
        const last = drawings[4]
        expect(last.x + Math.cos(last.angle) * last.length).toBeCloseTo(ORIGIN.x + slash().reach)
        expect(drawings.some(each => Math.abs(each.angle) > 0.01)).toBe(true)
    })

    test("a bolt → kinked again as it plays", () => {
        const bolt = { ...defaultAnimation("bolt"), ease: "linear" as const }
        const early = strikeDrawings(bolt, slash(), FRAME, 0.1, 1)
        expect(strikeDrawings(bolt, slash(), FRAME, 0.9, 1)).not.toEqual(early)
    })

    test("a form with no way to be drawn → none, the area standing in", () => {
        expect(strikeDrawings({ ...defaultAnimation("hit") }, slash(), FRAME, 0.5)).toBeNull()
    })
})

describe("strikeDrawings, the other forms", () => {
    const at = (form: Parameters<typeof defaultAnimation>[0], share: number, extra = {}) => {
        return strikeDrawings({ ...defaultAnimation(form), ease: "linear", ...extra }, slash(), FRAME, share)!
    }

    test("a stab → starting at the origin, its tip at the end of the area halfway, back at the end", () => {
        const placed = slash()
        const start = at("stab", 0)[0]
        const half = at("stab", 0.5)[0]
        const end = at("stab", 1)[0]
        expect(start.x).toBeCloseTo(ORIGIN.x)
        expect(half.x + half.length).toBeCloseTo(ORIGIN.x + placed.reach)
        expect(end.x).toBeCloseTo(ORIGIN.x)
    })

    test("a slam → falling on the middle of the area from above, squashed at the end", () => {
        const placed = slash()
        const start = at("slam", 0)[0]
        const end = at("slam", 1)[0]
        expect(start.x).toBeCloseTo(placed.center.x)
        expect(start.y).toBeLessThan(end.y)
        expect(end.y).toBeCloseTo(placed.center.y)
        expect(end.width).toBeLessThan(at("slam", 0.5)[0].width)
    })

    test("a claw → a stroke for each count, the first drawn before the last", () => {
        expect(at("claw", 1)).toHaveLength(3)
        expect(at("claw", 0.05)).toHaveLength(1)
        expect(at("claw", 1, { count: 5 })).toHaveLength(5)
    })

    test("a bite → two jaws mirrored, closing toward the middle", () => {
        const open = at("bite", 0)
        const closed = at("bite", 0.6)
        expect(open).toHaveLength(2)
        expect(open[0].width).toBeGreaterThan(0)
        expect(open[1].width).toBeLessThan(0)
        expect(Math.abs(closed[0].y - closed[1].y)).toBeLessThan(Math.abs(open[0].y - open[1].y))
    })

    test("a burst → on the middle of the area, growing", () => {
        const placed = slash()
        const start = at("burst", 0)[0]
        const end = at("burst", 1)[0]
        expect(start.x).toBeCloseTo(placed.center.x)
        expect(end.length).toBeGreaterThan(start.length)
    })

    test("a wave → rays going out to the edge of the area, fading", () => {
        const start = at("wave", 0.1)
        const end = at("wave", 0.9)
        expect(start.length).toBeGreaterThan(1)
        const far = (one: { x: number, y: number }) => Math.hypot(one.x - ORIGIN.x, one.y - ORIGIN.y)
        expect(Math.max(...end.map(far))).toBeGreaterThan(Math.max(...start.map(far)))
        expect(end[0].alpha).toBeLessThan(start[0].alpha)
    })

    test("a shot → flying to the end of the area, rising over a hump with an arc, turning with a spin", () => {
        const placed = slash()
        const end = at("shot", 1)[0]
        expect(end.x).toBeCloseTo(ORIGIN.x + placed.reach)
        expect(at("shot", 0.5, { arc: 1 })[0].y).toBeLessThan(at("shot", 0.5)[0].y)
        expect(at("shot", 0.5, { spin: 360, duration: 1 })[0].angle).toBeCloseTo(Math.PI)
    })

    test("a stretch → from the attacker, longer as it goes, as wide as the area", () => {
        const half = at("stretch", 0.5)[0]
        const end = at("stretch", 1)[0]
        expect(half.x).toBeCloseTo(ORIGIN.x)
        expect(end.length).toBeCloseTo(slash().reach)
        expect(end.length).toBeGreaterThan(half.length)
        expect(end.width).toBeCloseTo(2 * slash().halfWidth)
    })
})

describe("impactDrawing", () => {
    const hit = readAnimation({ form: "hit", frames: 2 })

    test("the start → a little back from the unit, the end → on it", () => {
        const at = new Vector2(3, 3)
        const start = impactDrawing(hit, at, Vector2.RIGHT, 1, FRAME, 0)
        const end = impactDrawing(hit, at, Vector2.RIGHT, 1, FRAME, 1)
        expect(start.x).toBeLessThan(at.x)
        expect(end.x).toBeCloseTo(at.x)
    })

    test("a larger unit → a larger impact", () => {
        const small = impactDrawing(hit, ORIGIN, Vector2.RIGHT, 1, FRAME, 0.5)
        const big = impactDrawing(hit, ORIGIN, Vector2.RIGHT, 2, FRAME, 0.5)
        expect(big.length).toBeCloseTo(small.length * 2)
        expect(big.width).toBeCloseTo(small.width * 2)
    })
})

describe("the progress of a blow", () => {
    test("each curve → 0 at the start and 1 at the end", () => {
        for(const ease of ["linear", "in", "out", "inout"] as const){
            expect(eased(ease, 0)).toBe(0)
            expect(eased(ease, 1)).toBe(1)
        }
        expect(eased("in", 0.5)).toBeLessThan(0.5)
        expect(eased("out", 0.5)).toBeGreaterThan(0.5)
    })

    test("a fade → whole until it starts, gone at the end, none to stay whole", () => {
        const sweep = defaultAnimation("sweep")
        expect(fadeOf(sweep, 0.5)).toBe(1)
        expect(fadeOf(sweep, 1)).toBe(0)
        expect(fadeOf({ ...sweep, fade: 0 }, 1)).toBe(1)
    })

    test("the frames of a picture → shown in turn, the last one held", () => {
        const animation = { ...defaultAnimation("sweep"), frames: 4 }
        expect([0, 0.3, 0.6, 1].map(t => frameOf(animation, t))).toEqual([0, 1, 2, 3])
    })
})
