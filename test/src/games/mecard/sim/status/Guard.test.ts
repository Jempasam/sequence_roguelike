import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { WAIT } from "@game/core-src/games/mecard/sim/card/subs/movement/Wait"
import {
    COUNTER,
    DISARM,
    DODGE,
    SLIDING_PARRY,
    WOODEN_SHIELD,
} from "@game/core-src/games/mecard/sim/status/subs/Dodge"
import { STUNNED } from "@game/core-src/games/mecard/sim/status/subs/Stunned"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"
import type { StatusType } from "@game/core-src/games/mecard/sim/status/Status"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../fixtures"

/** An attacker facing down on a guard just below it, the guard holding a status. */
function facing(type: StatusType|null, level = 1): { on: Battle, attacker: Unit, guard: Unit } {
    const on = battle()
    const attacker = unit(on, 3, 3, { team: MONSTERS, direction: Vector2.DOWN })
    const guard = unit(on, 3, 4)
    if(type) on.applyStatus(guard, type, level)
    return { on, attacker, guard }
}

describe("Guards", () => {
    test("a dodge → the first attack misses, the next lands", () => {
        const plain = facing(null)
        play(plain.on, [[plain.attacker, chain(SLASH)]])
        const hit = 4 - plain.guard.life
        const { on, attacker, guard } = facing(DODGE)
        play(on, [[attacker, chain(SLASH, SLASH)]])
        expect(guard.life).toBe(4 - hit)
        expect(guard.statuses.has(DODGE)).toBe(false)
    })

    test("a dodge of 2 → two attacks miss", () => {
        const { on, attacker, guard } = facing(DODGE, 2)
        play(on, [[attacker, chain(SLASH, SLASH)]])
        expect(guard.life).toBe(4)
    })

    test("a dodge → one less at the start of each turn of its unit", () => {
        const { on, attacker, guard } = facing(DODGE, 2)
        play(on, [[guard, chain(WAIT)], [attacker, chain(WAIT)]])
        expect(guard.statusOf(DODGE)?.level).toBe(1)
    })

    test("a counter → the attacker is stunned", () => {
        const { on, attacker, guard } = facing(COUNTER)
        play(on, [[attacker, chain(SLASH)]])
        expect(guard.life).toBe(4)
        expect(attacker.statusOf(STUNNED)?.level).toBe(1)
    })

    test("a wooden shield → pushed away from the attacker", () => {
        const { on, attacker, guard } = facing(WOODEN_SHIELD)
        play(on, [[attacker, chain(SLASH)]])
        expect(guard.life).toBe(4)
        expect(guard.position.y).toBeGreaterThan(4.5)
        expect(guard.position.x).toBeCloseTo(3)
    })

    test("a sliding parry → the two swap places", () => {
        const { on, attacker, guard } = facing(SLIDING_PARRY)
        play(on, [[attacker, chain(SLASH)]])
        expect(guard.life).toBe(4)
        expectAt(guard, 3, 3)
        expectAt(attacker, 3, 4)
    })

    test("a disarm → the card that struck goes to its hand", () => {
        const { on, attacker, guard } = facing(DISARM)
        play(on, [[attacker, chain(SLASH)]])
        expect(guard.life).toBe(4)
        expect(guard.hand).toContain(SLASH)
    })
})
