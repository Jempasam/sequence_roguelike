import { describe, expect, test } from "vitest"
import { ARM_POINTS, ARM_SETTINGS, armPose } from "@game/core/mecard/arm"
import type { ArmPose } from "@game/core/mecard/arm"

// --- Fixture builders ---

/** The size of the interface the forearm is tried in, in virtual pixels. */
const WIDTH = 620
const HEIGHT = 348

/** An interface too tall for the forearm to reach the bottom edge from where its tip would stand. */
const TALL = 900

/** The anchor of the forearm along the bottom edge. */
const ANCHOR = WIDTH * ARM_SETTINGS.baseShare

/** Where the forearm stands to point at a point of the interface, as it is set at first. */
function poseAt(x: number, y: number, height = HEIGHT): ArmPose {
    return armPose(x, y, WIDTH, height, ARM_POINTS, ARM_SETTINGS)
}

/** Where a point of the picture of the forearm lies in the interface. */
function placed(pose: ArmPose, x: number, y: number): { x: number, y: number } {
    const { scale } = ARM_SETTINGS
    const dx = (x - ARM_POINTS.tipX) * scale
    const dy = (y - ARM_POINTS.tipY) * scale
    return {
        x: pose.x + dx * Math.cos(pose.tilt) - dy * Math.sin(pose.tilt),
        y: pose.y + dx * Math.sin(pose.tilt) + dy * Math.cos(pose.tilt),
    }
}

/** The `y` of the higher end of the cut at the bottom of the forearm. */
function cutTop(pose: ArmPose): number {
    return Math.min(placed(pose, 0, ARM_POINTS.height).y, placed(pose, ARM_POINTS.width, ARM_POINTS.height).y)
}

/** Every point of a grid over the interface. */
function grid(height: number): [number, number][] {
    const points: [number, number][] = []
    for(let x = 0; x <= WIDTH; x += 20){
        for(let y = 0; y <= height; y += 12) points.push([x, y])
    }
    return points
}

// --- Tests ---

describe("armPose", () => {
    test("stands its tip a share of the way from its anchor to the point", () => {
        const pose = poseAt(ANCHOR - 40, HEIGHT - 200)
        expect(pose.x).toBeCloseTo(ANCHOR - 40 * ARM_SETTINGS.reachShare)
        expect(pose.y).toBeCloseTo(HEIGHT - 200 * ARM_SETTINGS.reachShare)
    })

    test("lies along the way from its anchor to the point while it may", () => {
        expect(poseAt(ANCHOR - 40, HEIGHT - 200).tilt).toBeCloseTo(Math.atan2(-40, 200))
        expect(poseAt(ANCHOR + 40, HEIGHT - 200).tilt).toBeCloseTo(Math.atan2(40, 200))
        expect(poseAt(ANCHOR, 100).tilt).toBeCloseTo(0)
    })

    test("turns no farther than its most wherever the point is", () => {
        const most = ARM_SETTINGS.maxTilt * Math.PI / 180
        for(const [x, y] of grid(HEIGHT)){
            expect(Math.abs(poseAt(x, y).tilt)).toBeLessThanOrEqual(most + 1e-9)
        }
    })

    test("keeps the cut at its bottom under the bottom edge wherever the point is", () => {
        for(const height of [HEIGHT, TALL]){
            for(const [x, y] of grid(height)){
                expect(cutTop(poseAt(x, y, height))).toBeGreaterThanOrEqual(height - 1e-9)
            }
        }
    })

    test("has its tip on the bottom edge or under it when the point is at the very bottom", () => {
        for(let x = 0; x <= WIDTH; x += 20){
            expect(poseAt(x, HEIGHT).y).toBeGreaterThanOrEqual(HEIGHT)
        }
    })

    test("moves little when the point crosses over its anchor", () => {
        const left = poseAt(ANCHOR - 0.01, 100)
        const right = poseAt(ANCHOR + 0.01, 100)
        const [from, to] = [placed(left, ARM_POINTS.width, 0), placed(right, ARM_POINTS.width, 0)]
        expect(Math.hypot(to.x - from.x, to.y - from.y)).toBeLessThan(0.1)
    })

    test("slides down along itself until its cut reaches the edge when it is too short", () => {
        const y = 0
        const pose = poseAt(ANCHOR - 100, y, TALL)
        const tipY = TALL + (y - TALL) * ARM_SETTINGS.reachShare
        expect(pose.y).toBeGreaterThan(tipY)
        expect(cutTop(pose)).toBeCloseTo(TALL)
        expect(pose.tilt).toBeCloseTo(Math.atan2(-100, TALL))
    })

    test("gives the same pose for the same point", () => {
        expect(poseAt(123, 45)).toEqual(poseAt(123, 45))
    })
})
