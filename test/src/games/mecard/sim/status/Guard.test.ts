import { describe, expect, test } from "vitest"
import { COUNTER, DISARM, DODGE, SLASH, SLIDING_PARRY, Vector2, WAIT, WOODEN_SHIELD } from "@game/core/mecard"
import type { Battle, StatusType, Unit } from "@game/core/mecard"

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
        expect(on.events.some(event => event.type === "status" && event.unit === attacker && event.text === "étourdi")).toBe(true)
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
