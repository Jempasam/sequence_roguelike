import { describe, expect, test } from "vitest"
import { STEP_DISABLED } from "@game/core-src/games/mecard/sim/battle/mecanic/step/signals"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { ELECTROCUTED } from "@game/core-src/games/mecard/sim/status/subs/Electrocuted"
import { STUNNED } from "@game/core-src/games/mecard/sim/status/subs/Stunned"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../fixtures"

/** A walker facing up at the bottom of the arena. */
function walking() {
    const on = battle()
    const walker = unit(on, 3, 6)
    unit(on, 0, 0, { team: MONSTERS })
    return { on, walker }
}

// --- Tests ---

describe("ELECTROCUTED", () => {
    test("an electrocuted unit → its step disabled, never played", () => {
        const { on, walker } = walking()
        on.applyStatus(walker, ELECTROCUTED, 1)
        const cards: unknown[] = []
        on.observers.of(STEP_DISABLED).add(step => cards.push(step.cards))
        play(on, [[walker, chain(STEP)]])
        expectAt(walker, 3, 6)
        expect(cards).toEqual([{ first: 0, last: 0 }])
        expect(walker.statusOf(ELECTROCUTED)).toBeUndefined()
    })

    test("one level for two steps → the second played", () => {
        const { on, walker } = walking()
        on.applyStatus(walker, ELECTROCUTED, 1)
        play(on, [[walker, chain(STEP, STEP)]])
        expectAt(walker, 3, 4)
    })

    test.each([
        ["stunned first", [STUNNED, ELECTROCUTED]],
        ["electrocuted first", [ELECTROCUTED, STUNNED]],
    ])("both, %s → one turn goes by, the step disabled, a level of each lost", (_order, types) => {
        const { on, walker } = walking()
        for(const type of types) on.applyStatus(walker, type, 1)
        play(on, [[walker, chain(STEP, STEP)]])
        expectAt(walker, 3, 4)
        expect(walker.statuses.size).toBe(0)
        expect(on.events.filter(event => event.type === "skipped")).toHaveLength(1)
    })
})
