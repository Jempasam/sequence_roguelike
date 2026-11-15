import { describe, expect, test } from "vitest"
import {
    ActionCard, ELEMENT, ELEMENT_ON_BLADE, FIRE, mergeable, MergedCard, Rarity, REPEAT_2, resolve, SPELL, STEP, TURN_STEPS, TURNS,
    Vector2,
} from "@game/core/mecard"
import type { Action } from "@game/core/mecard"

import { battle, unit } from "../../../fixtures"

/** A turn to the right that is a card of its own, since a card to choose a direction of cannot be merged. */
const QUARTER_TURN = new ActionCard("Quart de tour", "Se tourne à droite.", Rarity.COMMON, TURNS[TURN_STEPS / 4].action)

/** The actions a card gives at the end of the preparation. */
function stepsOf(card: MergedCard): readonly Action[] {
    return resolve([card], { pick: options => options[0] }).chain.actionsLeft()
}

// --- Tests ---

describe("MergedCard.constructor", () => {
    test("two actions → named by both, giving one step", () => {
        const merged = new MergedCard([STEP, QUARTER_TURN])
        expect(merged.name).toBe(`${STEP.name} & ${QUARTER_TURN.name}`)
        expect(stepsOf(merged)).toHaveLength(1)
        expect(merged.input).toBeNull()
    })

    test("an element → an error", () => {
        expect(() => new MergedCard([STEP, FIRE])).toThrow()
    })

    test("cards taking the same kind of thing → the merge takes it too, however many take it", () => {
        expect(new MergedCard([ELEMENT_ON_BLADE, STEP]).input).toBe(ELEMENT)
        expect(new MergedCard([ELEMENT_ON_BLADE, SPELL, STEP]).input).toBe(ELEMENT)
        expect(mergeable([ELEMENT_ON_BLADE, SPELL])).toBe(true)
    })

    test("cards taking different kinds of things → an error", () => {
        expect(() => new MergedCard([REPEAT_2, ELEMENT_ON_BLADE])).toThrow(/one kind of thing/)
        expect(mergeable([REPEAT_2, ELEMENT_ON_BLADE])).toBe(false)
    })

    test("a merge → handed what it takes, each card taking something playing it", () => {
        const merged = new MergedCard([ELEMENT_ON_BLADE, SPELL, STEP])
        expect(merged.get(FIRE.get())).toBeDefined()
    })
})

describe("MergedCard, played", () => {
    test("two cards → one after the other, in one step", () => {
        const on = battle()
        const both = unit(on, 3, 5)
        const steps = stepsOf(new MergedCard([STEP, QUARTER_TURN]))
        expect(steps).toHaveLength(1)
        steps[0].use({ battle: on, unit: both })
        expect(both.position.x).toBeCloseTo(3)
        expect(both.position.y).toBeCloseTo(3)
        expect(both.direction).toEqual(Vector2.RIGHT)
    })

    test("two cards → previewed one after the other, the second from where the first leaves the unit", () => {
        const on = battle()
        const both = unit(on, 3, 5)
        const [step] = stepsOf(new MergedCard([STEP, QUARTER_TURN]))
        const shown = step.preview({ battle: on, unit: both, pose: both })
        expect(shown.pose.direction).toEqual(Vector2.RIGHT)
        expect(shown.pose.position.y).toBeCloseTo(3)
    })
})
