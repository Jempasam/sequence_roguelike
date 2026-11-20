import { Rng } from "@game/core/mecard"
import { fixed, randomTeams, shrinking } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

/** Players named a, b, c… */
function players(count: number): string[] {
    return Array.from({ length: count }, (_, index) => String.fromCharCode(97 + index))
}

// --- Tests ---

describe("randomTeams", () => {
    test.each([4, 5, 6, 7, 8, 9])("%i players in camps of two → each player in one camp or watching, none twice", count => {
        const { fights, watchers } = randomTeams(new Rng(count), fixed(2)).match(players(count))
        const fighting = fights.flatMap(fight => fight.sides.flat())
        const everyone = [...fighting, ...watchers.keys()].sort()
        expect(everyone).toEqual(players(count))
        for(const fight of fights) expect(fight.sides.map(side => side.length)).toEqual([2, 2])
        for(const number of watchers.values()) expect(number).toBeLessThan(fights.length)
    })

    test("five players in camps of two → exactly one spectator", () => {
        const { fights, watchers } = randomTeams(new Rng(1), fixed(2)).match(players(5))
        expect(fights).toHaveLength(1)
        expect(watchers.size).toBe(1)
    })

    test("three players, camps of two shrinking → one against one, one spectator", () => {
        const { fights, watchers } = randomTeams(new Rng(1), shrinking(2)).match(players(3))
        expect(fights).toHaveLength(1)
        expect(fights[0].sides.map(side => side.length)).toEqual([1, 1])
        expect(watchers.size).toBe(1)
    })

    test("too few players for two camps → no duel and no spectator", () => {
        expect(randomTeams(new Rng(1), fixed(2)).match(players(3)).fights).toEqual([])
        expect(randomTeams(new Rng(1), fixed(2)).match(players(3)).watchers.size).toBe(0)
        expect(randomTeams(new Rng(1), shrinking(2)).match(players(1)).fights).toEqual([])
        expect(randomTeams(new Rng(1), shrinking(2)).match([]).fights).toEqual([])
    })

    test("twelve players in camps of three → two duels, nobody left out", () => {
        const { fights, watchers } = randomTeams(new Rng(5), fixed(3)).match(players(12))
        expect(fights).toHaveLength(2)
        expect(watchers.size).toBe(0)
    })

    test("its own random numbers → a shuffle the same twice for the same seed, and not always the same order", () => {
        const first = randomTeams(new Rng(9), fixed(1)).match(players(8))
        const again = randomTeams(new Rng(9), fixed(1)).match(players(8))
        expect(again).toEqual(first)
        const orders = new Set(Array.from({ length: 10 }, (_, seed) => {
            return JSON.stringify(randomTeams(new Rng(seed), fixed(1)).match(players(8)).fights)
        }))
        expect(orders.size).toBeGreaterThan(1)
    })
})

describe("TeamSize", () => {
    test("fixed → the same whatever the number, at least one", () => {
        expect(fixed(3).size(2)).toBe(3)
        expect(fixed(0).size(2)).toBe(1)
    })

    test("shrinking → at most half of the players, at least one", () => {
        expect(shrinking(3).size(10)).toBe(3)
        expect(shrinking(3).size(5)).toBe(2)
        expect(shrinking(3).size(1)).toBe(1)
    })
})
