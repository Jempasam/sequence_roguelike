import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import type { Unit } from "@game/core-src/games/mecard/sim/battle/Unit"

import * as Pushing from "../../../../../../../../core/src/games/mecard/sim/battle/mecanic/push"
import { battle, unit } from "../../../fixtures"

// --- Tests ---

describe("Pushing.shoveViolently", () => {
    test("a unit shoved into another → told shocked, with the unit and the one it struck", () => {
        const on = battle()
        const shoved = unit(on, 3, 4)
        const struck = unit(on, 3, 3)
        const shocks: [Unit, Unit][] = []
        on.observers.of(Pushing.SHOCKED).add(({ unit: mover, struck: hit }) => shocks.push([mover, hit]))
        Pushing.shoveViolently({
            battle: on, by: null, target: shoved, direction: Vector2.UP, distance: 2, damage: 1,
        })
        expect(shocks[0]).toEqual([shoved, struck])
    })

    test("a unit shoved into nothing → not told shocked", () => {
        const on = battle()
        const shoved = unit(on, 3, 4)
        let shocks = 0
        on.observers.of(Pushing.SHOCKED).add(() => shocks++)
        Pushing.shoveViolently({
            battle: on, by: null, target: shoved, direction: Vector2.UP, distance: 1, damage: 1,
        })
        expect(shocks).toBe(0)
    })
})
