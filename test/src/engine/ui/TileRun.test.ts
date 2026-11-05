import { describe, expect, test } from "vitest"
import { TileRun } from "@game/core"
import type { Tiling } from "@game/core"

// --- Fixture builders ---

interface Tile {
    readonly start: number
    readonly end: number
    readonly from: number
    readonly to: number
}

/** The tiles of a length, for a tile showing the texels 10 to 20. */
function tiles(length: number, tile: number, tiling: Tiling): Tile[] {
    const run = new TileRun()
    run.lay(length, tile, 10, 20, tiling)
    return Array.from({ length: run.count }, (_, index) => {
        run.select(index)
        const { start, end, from, to } = run
        return { start, end, from, to }
    })
}

// --- Tests ---

describe("TileRun.lay", () => {
    test("a length of three tiles → three whole tiles", () => {
        expect(tiles(30, 10, {})).toEqual([
            { start: 0, end: 10, from: 10, to: 20 },
            { start: 10, end: 20, from: 10, to: 20 },
            { start: 20, end: 30, from: 10, to: 20 },
        ])
    })

    test("4.6 tiles, stretched → 5 tiles squeezed to fit", () => {
        const run = tiles(46, 10, {})
        expect(run).toHaveLength(5)
        expect(run[0].end).toBeCloseTo(9.2)
        expect(run[4].end).toBe(46)
        expect(run[4].to).toBe(20)
    })

    test("4.4 tiles, stretched → 4 tiles widened to fit", () => {
        const run = tiles(44, 10, {})
        expect(run).toHaveLength(4)
        expect(run[0].end).toBe(11)
    })

    test("shorter than half a tile, stretched → one tile squeezed", () => {
        expect(tiles(3, 10, {})).toEqual([{ start: 0, end: 3, from: 10, to: 20 }])
    })

    test("4.6 tiles, not stretched → the last tile cropped on a whole texel", () => {
        const run = tiles(46, 10, { stretch: false })
        expect(run).toHaveLength(5)
        expect(run[3]).toEqual({ start: 30, end: 40, from: 10, to: 20 })
        expect(run[4]).toEqual({ start: 40, end: 46, from: 10, to: 16 })
    })

    test("a sliver cropped → one texel at least", () => {
        expect(tiles(20.1, 10, { stretch: false })[2].to).toBe(11)
    })

    test("mirrored → every other tile backwards", () => {
        const run = tiles(30, 10, { mirror: true })
        expect(run.map(({ from, to }) => [from, to])).toEqual([[10, 20], [20, 10], [10, 20]])
    })

    test("mirrored and cropped → the tile flipped is cropped from its far end", () => {
        const flipped = tiles(15, 10, { stretch: false, mirror: true })[1]
        expect(flipped).toEqual({ start: 10, end: 15, from: 20, to: 15 })
    })
})

describe("TileRun.layWhole", () => {
    test("any length → one tile over all of it", () => {
        const run = new TileRun()
        run.layWhole(73, 10, 20)
        run.select(0)
        expect(run.count).toBe(1)
        expect([run.start, run.end, run.from, run.to]).toEqual([0, 73, 10, 20])
    })
})
