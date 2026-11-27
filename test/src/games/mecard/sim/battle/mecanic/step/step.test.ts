import { describe, expect, test } from "vitest"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import * as Steps from "@game/core-src/games/mecard/sim/battle/mecanic/step"
import type { DisabledStep } from "@game/core-src/games/mecard/sim/battle/mecanic/step/signals"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { WAIT } from "@game/core-src/games/mecard/sim/card/subs/movement/Wait"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"

import { battle, chain, expectAt, MONSTERS, unit } from "../../../fixtures"

/** A walker facing up at the bottom of the arena, its chain read from the execution on. */
function walking(...cards: Card[]): { on: Battle, walker: Unit, disabled: DisabledStep[], counts: number[] } {
    const on = battle()
    const walker = unit(on, 3, 6, { hand: [...cards] })
    unit(on, 0, 0, { team: MONSTERS })
    on.startRound()
    on.commit(walker, chain(...cards))
    on.endPreparation()
    const disabled: DisabledStep[] = []
    const counts: number[] = []
    on.observers.of(Steps.STEP_DISABLED).add(step => disabled.push(step))
    on.observers.of(Steps.STEPS_CHANGED).add(({ left }) => counts.push(left))
    return { on, walker, disabled, counts }
}

/** The reasons told for the steps that went by. */
function reasons(on: Battle): unknown[] {
    return on.events.flatMap(event => event.type === "skipped" ? [event.reason] : [])
}

// --- Tests ---

describe("skip", () => {
    test("a step skipped once → kept, played at the next turn", () => {
        const { on, walker, counts } = walking(STEP)
        const listening = walker.observers.of(Steps.INCOMING_STEP).add(incoming => {
            Steps.skip(incoming, "pause")
            listening.remove()
        })
        on.playStep()
        expectAt(walker, 3, 6)
        expect(counts).toEqual([1])
        on.playRound()
        expectAt(walker, 3, 4)
        expect(reasons(on)).toEqual(["pause"])
    })

    test("two listeners skipping → one step goes by, both reasons told", () => {
        const { on, walker } = walking(STEP)
        const observer = walker.observers.of(Steps.INCOMING_STEP)
        const first = observer.add(incoming => {
            Steps.skip(incoming, "un")
            first.remove()
        })
        const second = observer.add(incoming => {
            Steps.skip(incoming, "deux")
            second.remove()
        })
        on.playRound()
        expect(reasons(on)).toEqual(["un, deux"])
        expectAt(walker, 3, 4)
    })

    test("a change asked → the action read is turned into another", () => {
        const { on, walker } = walking(STEP)
        walker.observers.of(Steps.INCOMING_STEP).add(incoming => {
            incoming.changes.push(() => Steps.idle("autre chose"))
        })
        on.playRound()
        expectAt(walker, 3, 6)
        expect(reasons(on)).toEqual(["autre chose"])
    })
})

describe("disable", () => {
    test("a step not read yet → never played, its cards told, not counted as played", () => {
        const { on, walker, disabled, counts } = walking(STEP, WAIT)
        expect(Steps.disable(on, walker)).toBe(1)
        expect(disabled).toEqual([{ unit: walker, cards: { first: 0, last: 0 } }])
        expect(counts).toEqual([1])
        expect(walker.lastPlayed).toBeNull()
        on.playRound()
        expectAt(walker, 3, 6)
    })

    test("a step ready → thrown away, no card to tell", () => {
        const { on, walker, disabled } = walking(WAIT)
        Steps.insert(on, walker, [STEP.get()])
        Steps.disable(on, walker)
        expect(disabled).toEqual([{ unit: walker, cards: null }])
        on.playRound()
        expectAt(walker, 3, 6)
    })

    test("more steps than it has → only those it has", () => {
        const { on, walker } = walking(STEP, STEP)
        expect(Steps.disable(on, walker, 5)).toBe(2)
        expect(walker.stepsLeft).toBe(0)
    })
})

describe("insert", () => {
    test("actions inserted → played before what is left, the count told", () => {
        const { on, walker, counts } = walking(WAIT)
        Steps.insert(on, walker, [STEP.get()])
        expect(counts).toEqual([2])
        on.playStep()
        expectAt(walker, 3, 4)
    })
})
