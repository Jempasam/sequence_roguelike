import { describe, expect, test } from "vitest"
import { AIM, AIM_PROFILE, BITE_PROFILE, RUN_PROFILE, STEP, THRUST } from "@game/core/mecard"
import {
    around, bestRun, locate, marked, remaining, rounds, segments, without,
} from "@game/core/mecard/ordered-chains"

// --- Tests ---

const CHAIN = [AIM, STEP, STEP, THRUST, THRUST]

describe("segments", () => {
    test("cards of one profile next to each other → one segment, the order kept", () => {
        const found = segments(CHAIN).map(({ profile, cards }) => [profile.id, cards.length])
        expect(found).toEqual([["aim", 1], ["run", 2], ["bite", 2]])
    })
})

describe("bestRun", () => {
    test("a profile and a range → the contiguous run that fits it the most", () => {
        expect(bestRun(CHAIN, RUN_PROFILE, { min: 1, max: 3 })).toEqual([STEP, STEP])
        expect(bestRun(CHAIN, BITE_PROFILE, { min: 1, max: 1 })).toEqual([THRUST])
    })

    test("no card fits → nothing", () => {
        expect(bestRun([AIM], BITE_PROFILE, { min: 1, max: 2 })).toEqual([])
    })

    test("a range of at least two → the run has at least two cards", () => {
        expect(bestRun(CHAIN, AIM_PROFILE, { min: 2, max: 3 })).toEqual([])
    })
})

describe("cutting a chain", () => {
    test("rounds → cut every size cards, the last one shorter", () => {
        expect(rounds(CHAIN, 2).map(round => round.length)).toEqual([2, 2, 1])
    })

    test("locate → where a run of cards starts, -1 when it is nowhere", () => {
        expect(locate(CHAIN, [STEP, THRUST])).toBe(2)
        expect(locate(CHAIN, [THRUST, STEP])).toBe(-1)
    })

    test("around and without → what lies before and after a run", () => {
        expect(around(CHAIN, [STEP, STEP])).toEqual({ before: [AIM], after: [THRUST, THRUST] })
        expect(without(CHAIN, [STEP, STEP])).toEqual([AIM, THRUST, THRUST])
    })

    test("remaining → one card of the chain for each card taken, the order kept", () => {
        expect(remaining(CHAIN, [STEP], [THRUST])).toEqual([AIM, STEP, THRUST])
    })

    test("marked → each span replaced by its marker", () => {
        const spans = [{ marker: "run", at: 1, length: 2 }, { marker: "bite", at: 3, length: 2 }]
        const found = marked(CHAIN, spans)
        expect(found).toEqual([AIM, "run", "bite"])
    })
})
