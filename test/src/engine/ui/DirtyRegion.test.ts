import { describe, expect, test } from "vitest"
import { DirtyRegion, MAX_DIRTY_RECTS, Rect } from "@game/core"

// --- Fixture builders ---

/** A rectangle, or the bounds of a component, as `[x, y, width, height]`. */
function boundsOf(of: Readonly<Rect>|{ bounds: Readonly<Rect> }): number[] {
    const { x, y, width, height } = "bounds" in of ? of.bounds : of
    return [x, y, width, height]
}

// --- Tests ---

describe("DirtyRegion", () => {
    test("two touching rectangles → their union", () => {
        const region = new DirtyRegion()
        region.resize(100, 100)
        region.add(new Rect(0, 0, 10, 10))
        region.add(new Rect(10, 0, 10, 10))
        expect(region.rects.map(boundsOf)).toEqual([[0, 0, 20, 10]])
    })

    test("far apart → kept apart", () => {
        const region = new DirtyRegion()
        region.resize(100, 100)
        region.add(new Rect(0, 0, 5, 5))
        region.add(new Rect(90, 90, 5, 5))
        expect(region.rects.length).toBe(2)
    })

    test("more than the cap → the cheapest pair merged", () => {
        const region = new DirtyRegion()
        region.resize(1000, 1000)
        for(let i = 0; i <= MAX_DIRTY_RECTS; i++) region.add(new Rect(i * 100, 0, 5, 5))
        expect(region.rects.length).toBe(MAX_DIRTY_RECTS)
    })

    test("outside the texture → cut, or ignored when empty", () => {
        const region = new DirtyRegion()
        region.resize(100, 100)
        region.add(new Rect(90, 90, 20, 20))
        region.add(new Rect(200, 200, 5, 5))
        expect(region.rects.map(boundsOf)).toEqual([[90, 90, 10, 10]])
    })
})
