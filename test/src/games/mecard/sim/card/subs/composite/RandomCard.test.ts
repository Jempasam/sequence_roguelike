import { describe, expect, test } from "vitest"
import {
    Arena, Battle, FIRE, GAMBLE, PREPARATION, RandomCard, REPEAT_2, signatureOf, SPELL, STEP, THRUST, WATER,
} from "@game/core/mecard"
import type { Card } from "@game/core/mecard"

import { chain } from "../../../fixtures"

// --- Tests ---

describe("RandomCard.constructor", () => {
    test("two cards taking and giving the same → a preparation, truly typed as them", () => {
        const drawn = new RandomCard(REPEAT_2, GAMBLE)
        expect([drawn.output, drawn.input]).toEqual([PREPARATION, null])
        expect(signatureOf(drawn)).toEqual({ output: REPEAT_2.output, input: REPEAT_2.input })
        expect(drawn.name).toBe(`${REPEAT_2.name} | ${GAMBLE.name}`)
    })

    test("an element and an action → an error, the compiler told nothing", () => {
        const element: Card = FIRE
        expect(() => new RandomCard(element, STEP)).toThrow()
    })

    test("an action and a modifier → an error, for what they take", () => {
        expect(() => new RandomCard(THRUST, REPEAT_2)).toThrow()
    })
})

describe("RandomCard, drawn", () => {
    test("the same seed → the same card drawn", () => {
        const drawnWith = (seed: number): string => {
            const on = new Battle(new Arena(7, 7), seed)
            const resolution = chain(SPELL, new RandomCard(FIRE, WATER)).resolve({
                pick: options => on.rng.pick(options) ?? options[0],
            })
            return resolution.cards.join(", ")
        }
        expect(drawnWith(5)).toBe(drawnWith(5))
    })

    test("many seeds → both cards drawn", () => {
        const drawn = new Set<string>()
        for(let seed = 1; seed <= 20; seed++){
            const on = new Battle(new Arena(7, 7), seed)
            const resolution = chain(new RandomCard(FIRE, WATER)).resolve({
                pick: options => on.rng.pick(options) ?? options[0],
            })
            drawn.add(resolution.cards[0].name)
        }
        expect(drawn).toEqual(new Set([FIRE.name, WATER.name]))
    })
})
