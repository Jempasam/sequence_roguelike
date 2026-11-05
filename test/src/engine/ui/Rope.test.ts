import { describe, expect, test } from "vitest"
import { RAW_VERTEX_SIZE, Rope, Sprite } from "@game/core"
import type { Painter } from "@game/core"

import { uiSetup } from "../../fixtures/uiFixtures"
import { recordingPainter } from "./fixtures"

// --- Fixture builders ---

/** A rope from a picture twice as high as wide, at (8, 16) of a texture. */
function rope(tiling = {}): Rope {
    const { theme } = uiSetup()
    return new Rope(new Sprite(theme.white.texture, 8, 16, 4, 8), tiling)
}

/** The tiles a rope drew, each as its four corners `[x, y, u, v]`. */
function drawn(draw: (painter: Painter) => void): number[][][] {
    const { painter, quads } = recordingPainter()
    draw(painter)
    return quads.map(quad => [0, 1, 2, 3].map(corner => {
        const at = corner * RAW_VERTEX_SIZE
        return [quad[at], quad[at + 1], quad[at + 3], quad[at + 4]]
    }))
}

// --- Tests ---

describe("Rope.draw", () => {
    test("a line 6 times as long as thick, a sprite 1/2 → 3 tiles", () => {
        const tiles = drawn(painter => rope().draw(painter, { x: 0, y: 0 }, { x: 60, y: 0 }, 10))
        expect(tiles).toHaveLength(3)
    })

    test("its width spans the thickness, its height runs along the line", () => {
        const [tile] = drawn(painter => rope().draw(painter, { x: 0, y: 0 }, { x: 20, y: 0 }, 10))
        expect(tile).toEqual([[0, -5, 8, 16], [0, 5, 12, 16], [20, 5, 12, 24], [20, -5, 8, 24]])
    })

    test("a line going down → its tile turned with it", () => {
        const [tile] = drawn(painter => rope().draw(painter, { x: 0, y: 0 }, { x: 0, y: 20 }, 10))
        expect(tile.map(([x, y]) => [x, y])).toEqual([[5, 0], [-5, 0], [-5, 20], [5, 20]])
    })

    test("mirrored → the second tile runs backwards along the picture", () => {
        const mirrored = rope({ mirror: true })
        const tiles = drawn(painter => mirrored.draw(painter, { x: 0, y: 0 }, { x: 40, y: 0 }, 10))
        expect(tiles[1][0][3]).toBe(24)
        expect(tiles[1][3][3]).toBe(16)
    })

    test("not stretched → the last tile cropped", () => {
        const cropped = rope({ stretch: false })
        const tiles = drawn(painter => cropped.draw(painter, { x: 0, y: 0 }, { x: 30, y: 0 }, 10))
        expect(tiles).toHaveLength(2)
        expect(tiles[1][3]).toEqual([30, -5, 8, 20])
    })

    test("two points in the same place → nothing drawn", () => {
        expect(drawn(painter => rope().draw(painter, { x: 3, y: 3 }, { x: 3, y: 3 }, 10))).toEqual([])
    })
})
