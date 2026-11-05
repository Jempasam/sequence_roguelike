import { describe, expect, test } from "vitest"
import { quantities, scatter } from "@game/core/mecard/scatter"
import type { MapLayout, MapPoint, PieceSize, ScatteredPiece } from "@game/core/mecard/scatter"

// --- Fixture builders ---

const LARGE = { width: 48, height: 40 }
const MEDIUM = { width: 24, height: 24 }
const SMALL = { width: 12, height: 10 }
const PIECES = [SMALL, LARGE, MEDIUM]
const TOKENS = [{ x: 60, y: 60 }, { x: 180, y: 120 }, { x: 100, y: 300 }]
const PATHS = [{ from: TOKENS[0], to: TOKENS[1] }, { from: TOKENS[1], to: TOKENS[2] }]
const MAP: MapLayout = { size: { width: 240, height: 450 }, tokens: TOKENS, paths: PATHS }

/** The center of a piece laid. */
function centerOf(spot: ScatteredPiece): MapPoint {
    return { x: spot.x + PIECES[spot.piece].width / 2, y: spot.y + PIECES[spot.piece].height / 2 }
}

/** How large a piece is. */
function sizeOf({ width, height }: PieceSize): number {
    return Math.max(width, height)
}

/** How far a point lies from a segment, sampled along it. */
function distanceToPath(point: MapPoint, from: MapPoint, to: MapPoint): number {
    const shares = Array.from({ length: 201 }, (_, step) => step / 200)
    return Math.min(...shares.map(share => {
        return Math.hypot(from.x + share * (to.x - from.x) - point.x, from.y + share * (to.y - from.y) - point.y)
    }))
}

// --- Tests ---

describe("quantities", () => {
    test("a piece twice smaller → twice as many", () => {
        const [small, medium, large] = quantities([{ width: 10, height: 10 }, { width: 20, height: 5 }, { width: 40, height: 40 }], 80000)
        expect(small).toBe(medium * 2)
        expect(medium).toBe(large * 2)
    })

    test("twice the room → twice as many", () => {
        const [once] = quantities([{ width: 10, height: 10 }], 10000)
        const [twice] = quantities([{ width: 10, height: 10 }], 20000)
        expect(twice).toBe(once * 2)
    })

    test("no room → each piece once all the same", () => {
        expect(quantities(PIECES, 0)).toEqual([1, 1, 1])
    })
})

describe("scatter", () => {
    test("the same seed and map → the same pieces", () => {
        expect(scatter(5, PIECES, MAP)).toEqual(scatter(5, PIECES, MAP))
    })

    test.each([1, 2, 3, 4, 5, 6])("seed %i → every piece of each size laid", seed => {
        const laid = new Set(scatter(seed, PIECES, MAP).map(({ piece }) => piece))
        expect([...laid].sort()).toEqual([0, 1, 2])
    })

    test.each([1, 2, 3, 4, 5, 6])("seed %i → the largest pieces laid first", seed => {
        const sizes = scatter(seed, PIECES, MAP).map(({ piece }) => sizeOf(PIECES[piece]))
        expect(sizes).toEqual([...sizes].sort((a, b) => b - a))
    })

    test.each([1, 2, 3, 4, 5, 6])("seed %i → the smaller a piece, the more of it", seed => {
        const laid = scatter(seed, PIECES, MAP)
        const counts = PIECES.map((_, rank) => laid.filter(({ piece }) => piece === rank).length)
        expect(counts[0]).toBeGreaterThan(counts[2])
        expect(counts[2]).toBeGreaterThan(counts[1])
    })

    test.each([1, 2, 3, 4, 5, 6])("seed %i → every piece away from the tokens, the larger the farther", seed => {
        for(const spot of scatter(seed, PIECES, MAP)){
            const reach = sizeOf(PIECES[spot.piece]) * 0.7 + 14
            for(const { x, y } of TOKENS){
                const { x: left, y: top } = centerOf(spot)
                expect(Math.hypot(x - left, y - top)).toBeGreaterThanOrEqual(reach - 1)
            }
        }
    })

    test.each([1, 2, 3, 4, 5, 6])("seed %i → every piece away from the paths, the larger the farther", seed => {
        for(const spot of scatter(seed, PIECES, MAP)){
            const reach = sizeOf(PIECES[spot.piece]) * 0.7 + 3
            for(const { from, to } of PATHS){
                expect(distanceToPath(centerOf(spot), from, to)).toBeGreaterThanOrEqual(reach - 1)
            }
        }
    })

    test.each([1, 2, 3, 4, 5, 6])("seed %i → the pieces away from each other", seed => {
        const laid = scatter(seed, PIECES, MAP)
        for(const spot of laid){
            for(const other of laid){
                if(other === spot) continue
                const { x, y } = centerOf(other)
                const center = centerOf(spot)
                const reach = (sizeOf(PIECES[spot.piece]) + sizeOf(PIECES[other.piece])) / 2
                expect(Math.hypot(x - center.x, y - center.y)).toBeGreaterThan(reach)
            }
        }
    })

    test.each([1, 2, 3])("seed %i → every piece inside the map", seed => {
        for(const { piece, x, y } of scatter(seed, PIECES, MAP)){
            expect(x).toBeGreaterThanOrEqual(0)
            expect(y).toBeGreaterThanOrEqual(0)
            expect(x + PIECES[piece].width).toBeLessThanOrEqual(240)
            expect(y + PIECES[piece].height).toBeLessThanOrEqual(450)
        }
    })

    test("a path of no length → pieces laid around it", () => {
        const still = { x: 120, y: 200 }
        const map = { ...MAP, paths: [{ from: still, to: still }] }
        expect(scatter(1, PIECES, map).length).toBeGreaterThan(0)
    })

    test("no pieces → nothing laid", () => {
        expect(scatter(1, [], MAP)).toEqual([])
    })
})
