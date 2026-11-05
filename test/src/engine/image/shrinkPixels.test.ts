import { describe, expect, test } from "vitest"
import { shrinkPixels } from "@game/core"

// --- Tests ---

describe("shrinkPixels", () => {
    test("factor 1 → the same image", () => {
        const image = { width: 1, height: 1, data: new Uint8Array([1, 2, 3, 4]) }
        expect(shrinkPixels(image, 1)).toBe(image)
    })

    test("2×2 by 2 → one pixel, colors weighted by alpha", () => {
        const data = new Uint8Array([
            200, 0, 0, 255, 0, 0, 200, 0,
            200, 0, 0, 255, 0, 0, 0, 0,
        ])
        const shrunk = shrinkPixels({ width: 2, height: 2, data }, 2)
        expect(shrunk).toMatchObject({ width: 1, height: 1 })
        expect([...shrunk.data]).toEqual([200, 0, 0, 128])
    })

    test("3×1 by 2 → size rounded up, the last square cut by the edge", () => {
        const data = new Uint8Array([10, 10, 10, 255, 30, 30, 30, 255, 90, 90, 90, 255])
        const shrunk = shrinkPixels({ width: 3, height: 1, data }, 2)
        expect(shrunk).toMatchObject({ width: 2, height: 1 })
        expect([...shrunk.data]).toEqual([20, 20, 20, 128, 90, 90, 90, 64])
    })

    test("factor 0 → throws", () => {
        expect(() => shrinkPixels({ width: 1, height: 1, data: new Uint8Array(4) }, 0)).toThrow()
    })
})
