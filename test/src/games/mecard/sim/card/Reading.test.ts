import { describe, expect, test } from "vitest"
import {
    FIRE, FOCUS, GAMBLE, read, readsWhole, REPEAT_2, SPELL, STEP, supplied, THRUST,
} from "@game/core/mecard"

// --- Tests ---

describe("supplied", () => {
    test("a modifier of a modifier of an action → all given their input", () => {
        expect(supplied([REPEAT_2, GAMBLE, THRUST])).toEqual([true, true, true])
    })

    test("a modifier of a modifier at the end → neither given its input", () => {
        expect(supplied([STEP, REPEAT_2, GAMBLE])).toEqual([true, false, false])
    })
})

describe("read", () => {
    test("a modifier then an action → the modifier taking it, both played", () => {
        const reading = read([REPEAT_2, THRUST, STEP])
        expect(reading.roots.map(String)).toEqual([`${REPEAT_2.name}(${THRUST.name})`, STEP.name])
        expect(reading.active).toEqual([true, true, true])
    })

    test("a modifier at the end → its slot empty, greyed out", () => {
        const reading = read([STEP, REPEAT_2])
        expect(reading.roots.map(String)).toEqual([STEP.name, `${REPEAT_2.name}(_)`])
        expect(reading.greyed).toEqual([REPEAT_2])
    })

    test("a spell then its element → one tree", () => {
        expect(read([SPELL, FIRE]).roots.map(String)).toEqual([`${SPELL.name}(${FIRE.name})`])
    })

    test("an element before its spell → the element greyed out alone, the spell for want of an element", () => {
        const reading = read([FIRE, SPELL, STEP])
        expect(reading.greyed).toEqual([FIRE, SPELL])
        expect(reading.roots.map(String)).toEqual([FIRE.name, `${SPELL.name}(_)`, STEP.name])
    })

    test("a preparation card → a root, played", () => {
        const reading = read([FOCUS])
        expect(reading.roots.map(String)).toEqual([FOCUS.name])
        expect(reading.greyed).toEqual([])
    })

    test("a tree → its node knowing where it stands and how many cards it spans", () => {
        const [first, second] = read([STEP, REPEAT_2, THRUST]).roots
        expect([first.index, first.size, second.index, second.size]).toEqual([0, 1, 1, 2])
    })
})

describe("readsWhole", () => {
    test("Répéter ×2, Estoc → yes; Estoc, Répéter ×2 → no", () => {
        expect(readsWhole([REPEAT_2, THRUST])).toBe(true)
        expect(readsWhole([THRUST, REPEAT_2])).toBe(false)
    })
})
