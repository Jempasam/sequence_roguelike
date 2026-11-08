import { describe, expect, test } from "vitest"
import { addBattle, decided, emptyTally, margin, meanRounds, mergeTallies, played, winrate } from "@game/command_line/sim"
import type { Outcome, Tally } from "@game/command_line/sim"

// --- Fixture builders ---

/** A tally of battles ended as given, each one round long. */
function tallyOf(outcomes: Partial<Record<Outcome, number>>): Tally {
    const tally = emptyTally()
    for(const [outcome, count] of Object.entries(outcomes)){
        for(let index = 0; index < (count ?? 0); index++) addBattle(tally, outcome as Outcome, 1, 0)
    }
    return tally
}

// --- Tests ---

describe("addBattle", () => {
    test("each outcome → its own count, the rounds and the errors added", () => {
        const tally = emptyTally()
        addBattle(tally, "win", 10, 1)
        addBattle(tally, "loss", 4, 0)
        addBattle(tally, "draw", 6, 2)
        addBattle(tally, "timeout", 60, 0)
        expect(tally).toEqual({
            wins: 1, losses: 1, draws: 1, timeouts: 1, rounds: 80, errors: 3, softWins: 0, softLosses: 0,
        })
    })
})

describe("addBattle soft", () => {
    test("a soft result → counted as a win or a loss, and as soft too", () => {
        const tally = emptyTally()
        addBattle(tally, "win", 30, 0, true)
        addBattle(tally, "loss", 30, 0, true)
        addBattle(tally, "win", 10, 0)
        expect(tally).toMatchObject({ wins: 2, losses: 1, softWins: 1, softLosses: 1 })
        expect(mergeTallies([tally, tally])).toMatchObject({ softWins: 2, softLosses: 2 })
    })
})

describe("winrate", () => {
    test("wins over the battles that ended, a draw counting against", () => {
        expect(winrate(tallyOf({ win: 3, loss: 1, draw: 1 }))).toBeCloseTo(0.6)
    })

    test("timeouts → out of the winrate", () => {
        const tally = tallyOf({ win: 1, loss: 1, timeout: 8 })
        expect(winrate(tally)).toBeCloseTo(0.5)
        expect(decided(tally)).toBe(2)
        expect(played(tally)).toBe(10)
    })

    test("no battle ended → none", () => {
        expect(winrate(emptyTally())).toBeNull()
        expect(winrate(tallyOf({ timeout: 3 }))).toBeNull()
    })
})

describe("margin", () => {
    test("every battle won → not zero, and the interval stays within the winrate", () => {
        const half = margin(tallyOf({ win: 20 }))
        expect(half).not.toBeNull()
        expect(half ?? 0).toBeGreaterThan(0)
        expect(half ?? 0).toBeLessThan(0.2)
    })

    test("more battles → a narrower interval", () => {
        const wide = margin(tallyOf({ win: 5, loss: 5 })) ?? 0
        expect(margin(tallyOf({ win: 50, loss: 50 })) ?? 1).toBeLessThan(wide)
    })

    test("no battle ended → none", () => {
        expect(margin(emptyTally())).toBeNull()
    })
})

describe("meanRounds", () => {
    test("rounds over every battle played, timeouts included", () => {
        const tally = emptyTally()
        addBattle(tally, "win", 10, 0)
        addBattle(tally, "timeout", 30, 0)
        expect(meanRounds(tally)).toBe(20)
        expect(meanRounds(emptyTally())).toBeNull()
    })
})

describe("mergeTallies", () => {
    test("tallies → every count added", () => {
        const merged = mergeTallies([tallyOf({ win: 2, loss: 1 }), tallyOf({ win: 1, timeout: 4 })])
        expect(merged).toMatchObject({ wins: 3, losses: 1, timeouts: 4, rounds: 8 })
    })
})
