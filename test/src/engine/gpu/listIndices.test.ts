import { describe, expect, test } from "vitest"
import { listIndices, Primitive } from "@game/core"

// --- Tests ---

describe("listIndices", () => {
    test("TRIANGLE_STRIP → every other triangle flipped", () => {
        const indices = listIndices(Primitive.TRIANGLE_STRIP, [0, 1, 2, 3, 4])
        expect([...indices]).toEqual([0, 1, 2, 2, 1, 3, 2, 3, 4])
    })

    test("TRIANGLE_FAN → each triangle on the first vertex", () => {
        expect([...listIndices(Primitive.TRIANGLE_FAN, [5, 6, 7, 8])]).toEqual([5, 6, 7, 5, 7, 8])
    })

    test("LINE_LOOP → the closing segment added", () => {
        expect([...listIndices(Primitive.LINE_LOOP, [0, 1, 2])]).toEqual([0, 1, 1, 2, 2, 0])
    })

    test("independent primitive → throws", () => {
        expect(() => listIndices(Primitive.TRIANGLES, [0, 1, 2])).toThrow()
    })
})
