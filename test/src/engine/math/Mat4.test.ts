import { describe, expect, test } from "vitest"
import { Mat4, Quat, Vec3 } from "@game/core"

// --- Fixture builders ---

function moved(m: Mat4, x: number, y: number, z = 0): number[] {
    const out = m.transformPoint(new Vec3(x, y, z), new Vec3())
    return [out.x, out.y, out.z].map(value => Math.round(value * 1e6) / 1e6 + 0)
}

// --- Tests ---

describe("Mat4 composition", () => {
    test("translate then scale → scaled first, then moved", () => {
        expect(moved(new Mat4().translate(10, 20).scale(2), 1, 1)).toEqual([12, 22, 0])
    })

    test("rotateZ a quarter turn → x goes down, as y is down", () => {
        expect(moved(new Mat4().rotateZ(Math.PI / 2), 1, 0)).toEqual([0, 1, 0])
    })

    test("translate then rotate → turns around the moved origin", () => {
        expect(moved(new Mat4().translate(5, 0).rotateZ(Math.PI / 2), 1, 0)).toEqual([5, 1, 0])
    })
})

describe("Mat4.setProduct", () => {
    test("into one of its factors → same as into a new matrix", () => {
        const a = new Mat4().translate(1, 2, 3).rotateZ(0.3)
        const b = new Mat4().scale(2, 3)
        const expected = new Mat4().setProduct(a, b)
        expect(a.setProduct(a, b).equals(expected)).toBe(true)
    })
})

describe("Mat4.setRotation", () => {
    test("a quarter turn around z → same as rotateZ", () => {
        const q = new Quat().setAxisAngle(0, 0, 1, Math.PI / 2)
        expect(moved(new Mat4().setRotation(q), 1, 0)).toEqual(moved(new Mat4().rotateZ(Math.PI / 2), 1, 0))
    })
})

describe("Mat4.planeScale", () => {
    test("scaled by 3 and turned → 3", () => {
        expect(new Mat4().rotateZ(1).scale(3).planeScale).toBeCloseTo(3)
    })
})
