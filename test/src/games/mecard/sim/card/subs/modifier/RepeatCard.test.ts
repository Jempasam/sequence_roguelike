import { describe, expect, test } from "vitest"
import { MIRROR, REPEAT_2, REPEAT_3, STEP, TORNADO, Vector2, WAIT } from "@game/core/mecard"
import type { Action } from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, unit } from "../../../fixtures"

/** An action counting how many times it is played, and doing nothing else. */
function counting(): { action: Action, plays: () => number } {
    let plays = 0
    const action: Action = {
        use: () => { plays++ },
        preview: ({ pose }) => ({ indicators: [], pose }),
    }
    return { action, plays: () => plays }
}

// --- Tests ---

describe("a card playing its action more than once", () => {
    test("repeat → every play in one step, one action given", () => {
        const { action, plays } = counting()
        const on = battle()
        const hero = unit(on, 3, 3)
        const repeated = REPEAT_3.get(action)
        repeated.use({ battle: on, unit: hero })
        expect(plays()).toBe(3)
    })

    test("repeat of a step → both walks played by one turn", () => {
        const on = battle()
        const walker = unit(on, 3, 6, { hand: [REPEAT_2, STEP] })
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        on.commit(walker, chain(REPEAT_2, STEP))
        on.endPreparation()
        expect(walker.stepsLeft).toBe(1)
        on.playStep()
        expectAt(walker, 3, 2)
        expect(walker.stepsPlayed).toHaveLength(1)
        expect(walker.stepsLeft).toBe(0)
    })

    test("repeat shocked → all its plays lost with the step", () => {
        const on = battle()
        const walker = unit(on, 3, 6, { hand: [REPEAT_2, STEP, WAIT] })
        unit(on, 0, 0, { team: MONSTERS })
        on.startRound()
        on.commit(walker, chain(REPEAT_2, STEP, WAIT))
        on.endPreparation()
        on.shock(walker)
        on.playRound()
        expectAt(walker, 3, 6)
    })

    test("repeat of a unit that dies → no more plays", () => {
        const on = battle()
        const hero = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        let plays = 0
        const mortal: Action = {
            use: ({ unit: playing }) => {
                plays++
                playing.hearts.slay(null)
            },
            preview: ({ pose }) => ({ indicators: [], pose }),
        }
        REPEAT_3.get(mortal).use({ battle: on, unit: hero })
        expect(plays).toBe(1)
    })

    test("mirror → the action, a half turn, then the action again", () => {
        const on = battle()
        const walker = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        MIRROR.get(STEP.get()).use({ battle: on, unit: walker })
        // Two meters up, a half turn, two meters back down.
        expectAt(walker, 3, 3)
        expect(walker.direction).toEqual(Vector2.DOWN)
    })

    test("tornado → four plays with a quarter turn after each, one step, facing as it started", () => {
        const { action, plays } = counting()
        const on = battle()
        const spinner = unit(on, 3, 3)
        unit(on, 0, 0, { team: MONSTERS })
        TORNADO.get(action).use({ battle: on, unit: spinner })
        expect(plays()).toBe(4)
        expect(spinner.direction).toEqual(Vector2.UP)
    })
})
