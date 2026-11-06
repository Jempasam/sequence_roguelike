import { describe, expect, test } from "vitest"
import { NineSlice, RAW_VERTEX_SIZE, Rect, Sprite } from "@game/core"
import type { NineSliceOptions } from "@game/core"

import { uiSetup } from "../../fixtures/uiFixtures"
import { recordingPainter } from "./fixtures"

// --- Fixture builders ---

/** A nine-slice from a picture of 12 by 12 at (100, 16), with margins of 2: its center is 8 by 8. */
function slice(options: NineSliceOptions = {}): NineSlice {
    const { theme } = uiSetup()
    const sprite = new Sprite(theme.white.texture, 100, 16, 12, 12)
    return new NineSlice(sprite, { left: 2, top: 2, right: 2, bottom: 2 }, options)
}

/** The zones of the tiles a nine-slice drew over a rectangle, as `[left, top, right, bottom]`. */
function tiles(nine: NineSlice, width: number, height: number): number[][] {
    const { painter, quads } = recordingPainter()
    nine.draw(painter, 0, 0, width, height)
    return quads.map(quad => [quad[0], quad[1], quad[2 * RAW_VERTEX_SIZE], quad[2 * RAW_VERTEX_SIZE + 1]])
}

/** The first texel column of each tile of the top edge of a nine-slice over a rectangle. */
function topEdgeUs(nine: NineSlice, width: number, height: number): number[] {
    const { painter, quads } = recordingPainter()
    nine.draw(painter, 0, 0, width, height)
    const top = quads.filter(quad => quad[1] === 0 && quad[0] >= nine.border.left
        && quad[0] < width - nine.border.right)
    return top.map(quad => quad[3])
}

// --- Tests ---

describe("NineSlice.withPeriod", () => {
    const margins = { left: 2, top: 2, right: 2, bottom: 2 }

    test("a period of 16 over a center of 8 → borders twice the margins, tiles of 16", () => {
        const { theme } = uiSetup()
        const sprite = new Sprite(theme.white.texture, 100, 16, 12, 12)
        const nine = NineSlice.withPeriod(sprite, margins, 16)
        expect(nine.border).toEqual({ left: 4, top: 4, right: 4, bottom: 4 })
        expect(nine.tiling).not.toBeNull()
        const us = topEdgeUs(nine, 4 + 48 + 4, 4 + 48 + 4)
        expect(us).toHaveLength(3)
    })

    test("a period that is not more than 0 → throws", () => {
        const { theme } = uiSetup()
        const sprite = new Sprite(theme.white.texture, 100, 16, 12, 12)
        expect(() => NineSlice.withPeriod(sprite, margins, 0)).toThrow()
    })
})

describe("NineSlice.draw", () => {
    test("no tiling → one draw of nine quads", () => {
        const { painter, quads } = recordingPainter()
        slice().draw(painter, 0, 0, 100, 100)
        expect(quads).toHaveLength(1)
        expect(quads[0]).toHaveLength(16 * RAW_VERTEX_SIZE)
    })

    test("a border → the margins drawn that wide", () => {
        const { painter, quads } = recordingPainter()
        slice({ border: { left: 3, top: 5, right: 7, bottom: 9 } }).draw(painter, 0, 0, 100, 100)
        const vertex = (index: number): number[] => {
            const at = index * RAW_VERTEX_SIZE
            return [quads[0][at], quads[0][at + 1]]
        }
        expect(vertex(5)).toEqual([3, 5])
        expect(vertex(10)).toEqual([93, 91])
    })

    test("tiled, a length of whole tiles → the edges and the center tiled, the corners alone", () => {
        const drawn = tiles(slice({ tiling: {} }), 2 + 16 + 2, 2 + 8 + 2)
        const corners = 4
        const topAndBottom = 2 * 2
        const leftAndRight = 2 * 1
        const center = 2 * 1
        expect(drawn).toHaveLength(corners + topAndBottom + leftAndRight + center)
        expect(drawn).toContainEqual([10, 2, 18, 10])
    })

    test("tiled and stretched → tiles covering their edge exactly", () => {
        const drawn = tiles(slice({ tiling: {} }), 2 + 19 + 2, 12)
        const top = drawn.filter(([, y]) => y === 0).slice(1, -1)
        expect(top).toHaveLength(2)
        expect(top[0][0]).toBe(2)
        expect(top[1][2]).toBe(21)
    })

    test("tiled, not stretched → the last tile of an edge cropped", () => {
        const { painter, quads } = recordingPainter()
        slice({ tiling: { stretch: false } }).draw(painter, 0, 0, 2 + 12 + 2, 12)
        const last = quads.find(quad => quad[0] === 10 && quad[1] === 0)
        expect(last?.[2 * RAW_VERTEX_SIZE]).toBe(14)
        expect(last?.[2 * RAW_VERTEX_SIZE + 3]).toBe(106)
    })

    test("tiled and mirrored → every other tile backwards", () => {
        const us = topEdgeUs(slice({ tiling: { mirror: true } }), 2 + 24 + 2, 12)
        expect(us).toEqual([102, 110, 102])
    })

    test("a thicker border → tiles growing with it, keeping their aspect ratio", () => {
        const border = { left: 4, top: 4, right: 4, bottom: 4 }
        const drawn = tiles(slice({ tiling: {}, border }), 4 + 32 + 4, 24)
        const top = drawn.filter(([, y]) => y === 0).slice(1, -1)
        expect(top).toHaveLength(2)
    })

    test("offset → the tiles follow the rectangle", () => {
        const { painter, quads } = recordingPainter()
        slice({ tiling: {} }).draw(painter, 50, 70, 12, 12)
        expect(Math.min(...quads.map(quad => quad[0]))).toBe(50)
        expect(Math.min(...quads.map(quad => quad[1]))).toBe(70)
    })

    test("smaller than its margins, tiled → drawn without a center", () => {
        expect(() => tiles(slice({ tiling: {} }), 3, 3)).not.toThrow()
    })
})

describe("NineSlice.opaqueInterior", () => {
    test("a border → the zone inside it", () => {
        const border = { left: 3, top: 5, right: 7, bottom: 9 }
        const zone = slice({ opaqueCenter: true, border }).opaqueInterior(100, 100, new Rect())
        expect(zone).toMatchObject({ x: 3, y: 5, width: 90, height: 86 })
    })
})

describe("new NineSlice", () => {
    test("a border of fractions of a pixel → refused", () => {
        expect(() => slice({ border: { left: 1.5, top: 0, right: 0, bottom: 0 } })).toThrow("whole pixels")
    })

    test("tiling a center the margins leave empty → refused", () => {
        const { theme } = uiSetup()
        const sprite = new Sprite(theme.white.texture, 100, 16, 4, 4)
        const margins = { left: 2, top: 2, right: 2, bottom: 2 }
        expect(() => new NineSlice(sprite, margins, { tiling: {} })).toThrow("nothing to repeat")
    })
})
