import { describe, expect, test } from "vitest"
import { ARENA_SIZE, monsterStart, partyStarts, pillarsFor, Rng, UNIT_RADIUS } from "@game/core/mecard"

// --- Fixture builders ---

/** Seeds whose pillars, drawn one after the other, once left no room for the last one and never ended. */
const STUCK_SEEDS = [257, 365, 526, 579]

// --- Tests ---

describe("partyStarts", () => {
    test("one character → in the middle of the bottom row", () => {
        const [start] = partyStarts(1)
        expect(start.x).toBeCloseTo(ARENA_SIZE / 2)
        expect(start.y).toBeCloseTo(7.5)
    })

    test("three characters → a centered row, two meters apart", () => {
        expect(partyStarts(3).map(start => [start.x, start.y])).toEqual([[2.5, 7.5], [4.5, 7.5], [6.5, 7.5]])
    })

    test("a fourth → a second row, above the first", () => {
        const [first, , , fourth] = partyStarts(4)
        expect(fourth.y).toBeCloseTo(first.y - 1)
        expect(fourth.x).toBeCloseTo(ARENA_SIZE / 2)
    })
})

describe("monsterStart", () => {
    test("monsters → every other meter along the top rows, from the second", () => {
        expect([0, 1, 2].map(index => monsterStart(index).x)).toEqual([2.5, 4.5, 6.5])
        expect(monsterStart(3).y).toBeGreaterThan(monsterStart(2).y)
    })
})

describe("pillarsFor", () => {
    test("seeds → three pillars, room to walk between them, clear of where the party stands", () => {
        const starts = partyStarts(3)
        for(const seed of [1, 2, 3, ...STUCK_SEEDS]){
            const pillars = pillarsFor(starts, new Rng(seed))
            expect(pillars, `seed ${seed}`).toHaveLength(3)
            for(const [index, pillar] of pillars.entries()){
                for(const other of pillars.slice(index + 1)){
                    expect(pillar.center.distance(other.center)).toBeGreaterThanOrEqual(2)
                }
                for(const start of starts){
                    expect(pillar.center.distance(start)).toBeGreaterThan(pillar.radius + UNIT_RADIUS)
                }
            }
        }
    })

    test("many seeds → always ends", () => {
        for(let seed = 1; seed <= 1500; seed++){
            expect(pillarsFor(partyStarts(1), new Rng(seed))).toHaveLength(3)
        }
    })
})
