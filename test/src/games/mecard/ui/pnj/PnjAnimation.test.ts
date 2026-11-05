import { describe, expect, test } from "vitest"
import { PNJ_ANIMATIONS, shiver, trackAt } from "@game/core/mecard/pnj"
import type { PnjAnimation } from "@game/core/mecard/pnj"

// --- Fixture builders ---

const RISE: PnjAnimation = { label: "rise", duration: 1, tracks: { lean: [[0, 0], [1, 1]] } }

// --- Tests ---

describe("trackAt", () => {
    test("track absent → rest: 0, or 1 for turn", () => {
        expect(trackAt(RISE, "head", 0.5)).toBe(0)
        expect(trackAt(RISE, "turn", 0.5)).toBe(1)
    })

    test("between keys → eased, half way at the middle", () => {
        expect(trackAt(RISE, "lean", 0.5)).toBeCloseTo(0.5)
        expect(trackAt(RISE, "lean", 0.25)).toBeLessThan(0.25)
    })

    test("past the last key → held", () => {
        expect(trackAt(RISE, "lean", 3)).toBe(1)
    })
})

describe("shiver", () => {
    test("2 swings → around the value, starting and ending on it", () => {
        expect(shiver(0, 3, 2, 1, 0.5)).toEqual([[0, 1], [1, 1.5], [2, 0.5], [3, 1]])
    })
})

describe("PNJ_ANIMATIONS", () => {
    test("each → keys in order, at rest at both ends, within its duration", () => {
        for(const animation of PNJ_ANIMATIONS){
            for(const [track, keys] of Object.entries(animation.tracks)){
                const name = `${animation.label} ${track}`
                const times = keys.map(([time]) => time)
                expect(times, name).toEqual([...times].sort((a, b) => a - b))
                const rest = track === "turn" ? 1 : 0
                expect(keys[0][1], name).toBe(rest)
                expect(keys[keys.length - 1][1], name).toBe(rest)
                expect(times[times.length - 1], name).toBeLessThanOrEqual(animation.duration)
            }
        }
    })
})
