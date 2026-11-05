import { describe, expect, test } from "vitest"
import { PnjPose } from "@game/core/mecard/pnj"
import type { HatPlace, PnjLayout } from "@game/core/mecard/pnj"

// --- Fixture builders ---

/** A character 100 wide and 200 high: a head 40 square on top, the body under it, a hat place of 20×5. */
const LAYOUT: PnjLayout = {
    width: 100,
    height: 200,
    body: { x: 0, y: 40, width: 100, height: 160 },
    skin: { x: 20, y: 80, width: 60, height: 40 },
    head: { x: 30, y: 0, width: 40, height: 40 },
    hatPlace: { x: 40, y: 0, width: 20, height: 5 },
}

function pointOf(run: (out: { x: number, y: number }) => void): { x: number, y: number } {
    const out = { x: 0, y: 0 }
    run(out)
    return out
}

// --- Tests ---

describe("PnjPose.bodyPointInto", () => {
    test("rest → the canvas, its origin between the feet", () => {
        const pose = new PnjPose(LAYOUT)
        expect(pointOf(out => pose.bodyPointInto(100, 50, out))).toEqual({ x: 50, y: -150 })
    })

    test("orientation -1 → mirrored, 0 → at its narrowest, never flat", () => {
        const pose = new PnjPose(LAYOUT)
        pose.orientation = -1
        expect(pointOf(out => pose.bodyPointInto(100, 50, out)).x).toBe(-50)
        pose.orientation = 0
        expect(pointOf(out => pose.bodyPointInto(100, 50, out)).x).toBeCloseTo(50 * 0.35)
        pose.orientation = -0.001
        expect(pointOf(out => pose.bodyPointInto(100, 50, out)).x).toBeCloseTo(-50 * 0.35, 1)
    })

    test("lean -1 → the top forward, lying flat; below the bending line unmoved", () => {
        const pose = new PnjPose(LAYOUT)
        pose.lean = -1
        const top = pointOf(out => pose.bodyPointInto(50, 40, out))
        // The bending line is 80 above the feet, the band 32 high: the top lies at the height the arc ends.
        expect(top.y).toBeCloseTo(-80 - 32 * 2 / Math.PI)
        expect(top.x).toBeGreaterThan(40)
        expect(pointOf(out => pose.bodyPointInto(50, 150, out))).toEqual({ x: 0, y: -50 })
    })

    test("squash 1 → half as high, wider", () => {
        const pose = new PnjPose(LAYOUT)
        pose.squash = 1
        const point = pointOf(out => pose.bodyPointInto(100, 100, out))
        expect(point.y).toBeCloseTo(-50)
        expect(point.x).toBeGreaterThan(50)
    })

    test("out of range → throws", () => {
        const pose = new PnjPose(LAYOUT)
        expect(() => { pose.lean = 1.5 }).toThrow(RangeError)
        expect(() => { pose.squash = -0.1 }).toThrow(RangeError)
        expect(() => { pose.head = Number.NaN }).toThrow(RangeError)
    })
})

describe("PnjPose.hat", () => {
    test("rest → the bottom middle of the hat place, straight", () => {
        const hat = new PnjPose(LAYOUT).hat
        expect(hat).toMatchObject({ scaleX: 1, width: 20, height: 5 })
        expect(hat.angle).toBeCloseTo(0)
        expect(hat.x).toBeCloseTo(0)
        expect(hat.y).toBeCloseTo(-195)
    })

    test("head up → turned backward, counterclockwise", () => {
        const pose = new PnjPose(LAYOUT)
        pose.head = 1
        expect(pose.hat.angle).toBeCloseTo(-Math.PI / 2)
    })

    test("pose changed → listeners told, not after dispose", () => {
        const pose = new PnjPose(LAYOUT)
        const heard: HatPlace[] = []
        const handle = pose.onHatMove(hat => heard.push(hat))
        pose.squash = 0.5
        expect(heard).toHaveLength(1)
        expect(heard[0].y).toBeGreaterThan(-195)
        handle.dispose()
        pose.squash = 0
        expect(heard).toHaveLength(1)
    })

    test("same pose set again → not told", () => {
        const pose = new PnjPose(LAYOUT)
        const heard: HatPlace[] = []
        pose.onHatMove(hat => heard.push(hat))
        pose.lean = 0
        expect(heard).toHaveLength(0)
    })
})

describe("PnjPose.headTurn", () => {
    test("turn -1 from facing right → the head at its narrowest, the body unmoved", () => {
        const pose = new PnjPose(LAYOUT)
        pose.headTurn = -1
        expect(pose.headOrientation).toBe(0)
        expect(pose.hat.scaleX).toBeCloseTo(0.35)
        expect(pointOf(out => pose.bodyPointInto(100, 50, out)).x).toBe(50)
    })

    test("turn past the narrowest → kept at the narrowest, on the side of the body", () => {
        const pose = new PnjPose(LAYOUT)
        pose.orientation = 0.5
        pose.headTurn = -1
        expect(pose.headOrientation).toBe(0)
        expect(pose.hat.scaleX).toBeCloseTo(0.35)
    })

    test("body flipped → the head flips with it", () => {
        const pose = new PnjPose(LAYOUT)
        pose.orientation = 0.1
        pose.headTurn = -0.5
        expect(pose.hat.scaleX).toBeCloseTo(0.35)
        pose.orientation = -0.1
        expect(pose.hat.scaleX).toBeCloseTo(-(0.35 + 0.65 * 0.6))
    })

    test("body at its narrowest on the left, head at its narrowest → still on the left", () => {
        const pose = new PnjPose(LAYOUT)
        pose.orientation = -0.01
        pose.headTurn = 0.5
        expect(pose.hat.scaleX).toBeCloseTo(-0.35)
    })

    test("turn past the side → kept at the side", () => {
        const pose = new PnjPose(LAYOUT)
        pose.orientation = 0.5
        pose.headTurn = 1
        expect(pose.headOrientation).toBe(1)
        expect(pose.hat.scaleX).toBe(1)
    })

    test("out of range → throws", () => {
        expect(() => { new PnjPose(LAYOUT).headTurn = 1.5 }).toThrow(RangeError)
    })
})

describe("PnjPose.gazeAt", () => {
    test("point far ahead at eye level → facing right, head straight", () => {
        const gaze = new PnjPose(LAYOUT).gazeAt(1000, -180)
        expect(gaze.orientation).toBe(1)
        expect(gaze.head).toBeCloseTo(0)
        expect(gaze.lean).toBeCloseTo(0)
    })

    test("point far behind → the body turns too, facing left", () => {
        const gaze = new PnjPose(LAYOUT).gazeAt(-1000, -180)
        expect(gaze.orientation).toBe(-1)
        expect(gaze.headTurn).toBe(0)
    })

    test("point half to the side → the head turns alone, the body stays whole", () => {
        // The eyes are at x = 0: 55 to the right faces 0.5, within the turn of the head alone.
        const gaze = new PnjPose(LAYOUT).gazeAt(55, -180)
        expect(gaze.orientation).toBe(1)
        expect(gaze.orientation + gaze.headTurn).toBeCloseTo(0.5)
    })

    test("point in front of the eyes → the body turns, never narrower than half", () => {
        const gaze = new PnjPose(LAYOUT).gazeAt(11, -180)
        expect(gaze.orientation).toBeCloseTo(0.6)
        expect(gaze.orientation + gaze.headTurn).toBeCloseTo(0.1)
        expect(new PnjPose(LAYOUT).gazeAt(0.001, -180).orientation).toBeCloseTo(0.5)
    })

    test("point crossing the eyes → head and body flip together", () => {
        const left = new PnjPose(LAYOUT).gazeAt(-0.001, -180)
        expect(left.orientation).toBeCloseTo(-0.5)
        expect(left.orientation + left.headTurn).toBeLessThanOrEqual(0)
    })



    test("point straight above → head as far as alone, the lean helping to a quarter turn", () => {
        const gaze = new PnjPose(LAYOUT).gazeAt(0.001, -10000)
        expect(gaze.head).toBeCloseTo(0.35)
        expect(gaze.head + gaze.lean).toBeCloseTo(1)
    })

    test("point slightly down → head alone", () => {
        const gaze = new PnjPose(LAYOUT).gazeAt(1000, 0)
        expect(gaze.head).toBeLessThan(0)
        expect(gaze.lean).toBe(0)
    })
})
