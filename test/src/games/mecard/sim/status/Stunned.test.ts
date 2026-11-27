import { describe, expect, test } from "vitest"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { loadBattle, saveBattle } from "@game/core-src/games/mecard/sim/save/battleSave"
import { STUNNED } from "@game/core-src/games/mecard/sim/status/subs/Stunned"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../fixtures"

/** A walker facing up at the bottom of the arena, stunned. */
function stunned(level: number) {
    const on = battle()
    const walker = unit(on, 3, 6)
    const other = unit(on, 0, 0, { team: MONSTERS })
    on.applyStatus(walker, STUNNED, level)
    return { on, walker, other }
}

// --- Tests ---

describe("STUNNED", () => {
    test("a stunned unit → its step goes by, played at the next turn, the level lost", () => {
        const { on, walker } = stunned(1)
        play(on, [[walker, chain(STEP)]])
        expectAt(walker, 3, 4)
        expect(walker.statusOf(STUNNED)).toBeUndefined()
        expect(on.events.filter(event => event.type === "skipped")).toHaveLength(1)
    })

    test("two levels → two turns go by", () => {
        const { on, walker } = stunned(2)
        play(on, [[walker, chain(STEP)]])
        expectAt(walker, 3, 4)
        expect(on.events.filter(event => event.type === "skipped")).toHaveLength(2)
    })

    test("a round with nothing to play → still stunned at the next", () => {
        const { on, walker, other } = stunned(1)
        play(on, [[other, chain(STEP)]])
        expect(walker.statusOf(STUNNED)?.level).toBe(1)
        play(on, [[walker, chain(STEP)]])
        expect(walker.statusOf(STUNNED)).toBeUndefined()
    })

    test("saved and loaded → still stunned, and acting", () => {
        const { on } = stunned(2)
        const again = loadBattle(saveBattle(on))
        const walker = again.units[0]
        expect(walker.statusOf(STUNNED)?.level).toBe(2)
        play(again, [[walker, chain(STEP)]])
        expect(walker.statusOf(STUNNED)).toBeUndefined()
    })
})
