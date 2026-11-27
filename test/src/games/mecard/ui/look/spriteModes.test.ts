import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { Box } from "@game/core-src/games/mecard/sim/battle/hitbox/Box"
import { hitboxMetrics } from "@game/core/mecard/hitbox-metrics"
import { wallFaces } from "@game/core/mecard/sprite-modes"
import type { WallFace } from "@game/core/mecard/sprite-modes"

// --- Fixture builders ---

/** A wall of 3 by 0.5 meters turned by an angle, in degrees, drawn at 10 pixels a meter around the pixel (100, 100). */
function facesAt(degrees: number): WallFace[] {
    const angle = degrees * Math.PI / 180
    const metrics = hitboxMetrics(new Box(3, 0.5), { position: Vector2.ZERO, direction: new Vector2(Math.cos(angle), Math.sin(angle)) })
    return wallFaces(metrics, { meter: 10, pixels: point => [100 + point.x * 10, 100 + point.y * 10] }, 100, 100)
}

/** How far apart the nearest ends of the faces of two kinds are, in pixels. */
function cornerGap(faces: readonly WallFace[]): number {
    const ends = (kind: WallFace["kind"]) => faces.filter(face => face.kind === kind).flatMap(face => [face.left, face.right])
    return Math.min(...ends("long").flatMap(one => ends("short").map(other => Math.hypot(one[0] - other[0], one[1] - other[1]))))
}

// --- Tests ---

describe("wallFaces", () => {
    test("a wall along the screen → its long side alone, not mirrored", () => {
        const faces = facesAt(0)
        expect(faces.map(face => face.kind)).toEqual(["long"])
        expect(faces[0].mirrored).toBe(false)
        expect(faces[0].right[0] - faces[0].left[0]).toBeCloseTo(30)
    })

    test("a wall pointing at the viewer → its short side alone, not mirrored", () => {
        const faces = facesAt(90)
        expect(faces.map(face => face.kind)).toEqual(["short"])
        expect(faces[0].mirrored).toBe(false)
    })

    test("turned so the short side shows on the right → both sides, not mirrored, meeting at a corner", () => {
        const faces = facesAt(30)
        expect(faces.map(face => face.kind).sort()).toEqual(["long", "short"])
        expect(faces.every(face => !face.mirrored)).toBe(true)
        const [long, short] = [faces.find(face => face.kind === "long"), faces.find(face => face.kind === "short")] as WallFace[]
        expect(short.left[0]).toBeGreaterThanOrEqual(long.right[0] - 1e-6)
        expect(cornerGap(faces)).toBeLessThan(1e-6)
    })

    test("turned so the short side shows on the left → both sides mirrored, meeting at a corner", () => {
        const faces = facesAt(-30)
        expect(faces.map(face => face.kind).sort()).toEqual(["long", "short"])
        expect(faces.every(face => face.mirrored)).toBe(true)
        const [long, short] = [faces.find(face => face.kind === "long"), faces.find(face => face.kind === "short")] as WallFace[]
        expect(short.right[0]).toBeLessThanOrEqual(long.left[0] + 1e-6)
        expect(cornerGap(faces)).toBeLessThan(1e-6)
    })

    test("the top → laid on the long side (the short one when it is the only one), over the whole box, mirrored with the faces", () => {
        for(const degrees of Array.from({ length: 24 }, (_, index) => index * 15)){
            const angle = degrees * Math.PI / 180
            const pose = { position: Vector2.ZERO, direction: new Vector2(Math.cos(angle), Math.sin(angle)) }
            const faces = facesAt(degrees)
            const front = faces.find(face => face.kind === "long") ?? faces[0]
            // Its front edge, and the back one a depth behind: the four corners of the box.
            const corners = [front.left, front.right, ...[front.left, front.right].map(end =>
                [end[0] + front.back[0], end[1] + front.back[1]] as const)]
            const expected = new Box(3, 0.5).outline(pose).map(point => [100 + point.x * 10, 100 + point.y * 10])
            for(const corner of corners){
                const nearest = Math.min(...expected.map(each => Math.hypot(each[0] - corner[0], each[1] - corner[1])))
                expect(nearest, `${degrees}°`).toBeLessThan(1e-6)
            }
            // The picture goes from the back to the front, along the foot: a mirrored foot gives a mirrored top.
            const [from, to] = front.mirrored ? [front.right, front.left] : [front.left, front.right]
            const turn = (to[0] - from[0]) * -front.back[1] - (to[1] - from[1]) * -front.back[0]
            expect(Math.sign(turn), `${degrees}°`).toBe(front.mirrored ? -1 : 1)
        }
    })

    test("a wall turned all the way round → mirrored exactly when its short side shows on the left", () => {
        for(let degrees = 0; degrees < 360; degrees += 15){
            const faces = facesAt(degrees)
            const long = faces.find(face => face.kind === "long")
            const short = faces.find(face => face.kind === "short")
            if(!long || !short){
                expect(faces.every(face => !face.mirrored), `${degrees}°`).toBe(true)
                continue
            }
            const onTheLeft = short.left[0] + short.right[0] < long.left[0] + long.right[0]
            expect(faces.every(face => face.mirrored === onTheLeft), `${degrees}°`).toBe(true)
            expect(cornerGap(faces), `${degrees}°`).toBeLessThan(1e-6)
        }
    })
})
