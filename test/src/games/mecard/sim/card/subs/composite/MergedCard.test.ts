import { describe, expect, test } from "vitest"
import { FIRE, MergedCard, REPEAT_2, resolve, STEP, TURN_RIGHT, Vector2 } from "@game/core/mecard"
import type { Action, Battle, Unit } from "@game/core/mecard"

import { battle, unit } from "../../../fixtures"

/** How many ticks actions take, played one after the other for a unit. */
function ticksOf(actions: readonly Action[], on: Battle, player: Unit): number {
    let ticks = 0
    for(const action of actions){
        const run = action.use({ battle: on, unit: player })
        while(!run.next().done) ticks++
    }
    return ticks
}

/** The actions a card gives at the end of the preparation. */
function stepsOf(card: MergedCard): readonly Action[] {
    return resolve([card], { pick: options => options[0] }).chain.actionsLeft()
}

// --- Tests ---

describe("MergedCard.constructor", () => {
    test("two actions → named by both, giving one step", () => {
        const merged = new MergedCard(STEP, TURN_RIGHT)
        expect(merged.name).toBe(`${STEP.name} & ${TURN_RIGHT.name}`)
        expect(stepsOf(merged)).toHaveLength(1)
    })

    test("an element → an error", () => {
        expect(() => new MergedCard(STEP, FIRE)).toThrow()
    })

    test("a modifier → an error, for what it takes", () => {
        expect(() => new MergedCard(REPEAT_2, STEP)).toThrow()
    })
})

describe("MergedCard, played", () => {
    test("two rows at once → as long as the longest of them, both done", () => {
        const alone = battle()
        const walker = unit(alone, 3, 5)
        const stepped = resolve([STEP], { pick: options => options[0] })
        const stepTicks = ticksOf(stepped.chain.actionsLeft(), alone, walker)
        const on = battle()
        const both = unit(on, 3, 5)
        const ticks = ticksOf(stepsOf(new MergedCard(STEP, TURN_RIGHT)), on, both)
        expect(ticks).toBe(stepTicks)
        expect(both.position).not.toEqual(new Vector2(3, 5))
        expect(both.direction).toEqual(Vector2.RIGHT)
    })
})
