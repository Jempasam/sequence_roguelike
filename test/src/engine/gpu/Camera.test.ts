import { describe, expect, test } from "vitest"
import { Camera, Mat4 } from "@game/core"

// --- Fixture builders ---

/** Where a world point lands in normalized device coordinates. */
function ndcOf(camera: Camera, x: number, y: number, z = 0): number[] {
    const e = camera.viewProjectionInto(new Mat4()).elements
    const w = e[3] * x + e[7] * y + e[11] * z + e[15]
    return [0, 1, 2].map(row => (e[row] * x + e[4 + row] * y + e[8 + row] * z + e[12 + row]) / w)
        .map(value => Math.round(value * 1e6) / 1e6 + 0)
}

// --- Tests ---

describe("Camera.pixelSpace", () => {
    test("(0, 0) → top left corner of clip space", () => {
        expect(ndcOf(Camera.pixelSpace(320, 180), 0, 0).slice(0, 2)).toEqual([-1, 1])
    })

    test("(width, height) → bottom right corner", () => {
        expect(ndcOf(Camera.pixelSpace(320, 180), 320, 180).slice(0, 2)).toEqual([1, -1])
    })

    test("odd size → edges still on whole pixels", () => {
        const camera = Camera.pixelSpace(5, 3)
        expect(ndcOf(camera, 0, 0).slice(0, 2)).toEqual([-1, 1])
        expect(ndcOf(camera, 5, 3).slice(0, 2)).toEqual([1, -1])
    })
})

describe("Camera depth", () => {
    test("greater z → smaller depth, so LEQUAL keeps the nearer", () => {
        const camera = Camera.pixelSpace(320, 180)
        expect(ndcOf(camera, 0, 0, 10)[2]).toBeLessThan(ndcOf(camera, 0, 0, -10)[2])
    })

    test("depthNear and depthFar → the ends of the depth range", () => {
        const camera = Camera.pixelSpace(320, 180)
        camera.depthNear = 50
        camera.depthFar = 30
        expect(ndcOf(camera, 0, 0, 50)[2]).toBe(-1)
        expect(ndcOf(camera, 0, 0, -30)[2]).toBe(1)
    })
})

describe("Camera.fov", () => {
    test("perspective → the focal plane keeps its size", () => {
        const camera = new Camera(200, 100)
        camera.fov = Math.PI / 3
        camera.depthNear = 10
        expect(ndcOf(camera, 100, 50).slice(0, 2)).toEqual([1, -1])
    })

    test("perspective → nearer looks larger", () => {
        const camera = new Camera(200, 100)
        camera.fov = Math.PI / 3
        camera.depthNear = 10
        expect(ndcOf(camera, 50, 0, 5)[0]).toBeGreaterThan(ndcOf(camera, 50, 0, 0)[0])
    })

    test("near plane behind the eye → throws", () => {
        const camera = new Camera(200, 100)
        camera.fov = Math.PI / 2
        expect(() => camera.viewProjectionInto(new Mat4())).toThrow(/behind its eye/)
    })
})

describe("Camera.version", () => {
    test("unchanged → same version", () => {
        const camera = new Camera(10, 10)
        expect(camera.version).toBe(camera.version)
    })

    test("moved → new version", () => {
        const camera = new Camera(10, 10)
        const before = camera.version
        camera.position.x = 3
        expect(camera.version).not.toBe(before)
    })
})
