import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core/mecard"
import type { Battle, Unit } from "@game/core/mecard"

import * as Walk from "../../../../../../../../core/src/games/mecard/sim/battle/mecanic/walk"
import { battle, unit } from "../../../fixtures"

const STRIDE = Walk.WALK_SPEED / 60

/** The heights a unit stands at, stride after stride, walking up until a stride falls short. */
function walkUp(on: Battle, walker: Unit): number[] {
    const heights = [walker.position.y]
    for(let i = 0; i < 45; i++){
        const gone = Walk.move(on, walker, Vector2.UP, STRIDE)
        heights.push(walker.position.y)
        if(gone.distance < STRIDE - Walk.TRAVEL_SLACK) break
    }
    return heights
}

// --- Tests ---

describe("Walk.move", () => {
    test.each([3, 3.01, 3.02, 3.03])("walk into a unit from %f → it stops at contact, never stepping back", y => {
        const on = battle()
        const walker = unit(on, 3, y)
        const obstacle = unit(on, 3, 1.5)
        const heights = walkUp(on, walker)
        expect(heights).toEqual([...heights].sort((a, b) => b - a))
        expect(walker.hitbox.gap(walker, obstacle.hitbox, obstacle)).toBeGreaterThanOrEqual(0)
        expect(walker.hitbox.gap(walker, obstacle.hitbox, obstacle)).toBeLessThan(STRIDE)
    })

    test("walk from an overlap, further in → it backs out once and stops", () => {
        const on = battle()
        const walker = unit(on, 3, 3)
        const obstacle = unit(on, 3, 1.5)
        const contact = 3 - walker.hitbox.gap(walker, obstacle.hitbox, obstacle)
        walker.position = new Vector2(3, contact - 0.05)
        const gone = Walk.travel({ battle: on, unit: walker }, Vector2.UP, 1)
        expect(gone.distance).toBe(0)
        expect(gone.struck).toBe(obstacle)
        expect(walker.position.y).toBeGreaterThanOrEqual(contact - 0.000001)
    })

    test("walk brushing past a body → it goes the whole way", () => {
        const on = battle()
        const walker = unit(on, 3, 4)
        const obstacle = unit(on, 3, 2)
        const touching = 2 - walker.hitbox.gap(walker, obstacle.hitbox, obstacle)
        walker.position = new Vector2(3 + touching - 0.04, 4)
        const gone = Walk.travel({ battle: on, unit: walker }, Vector2.UP, 3)
        expect(gone.distance).toBeCloseTo(3)
        expect(walker.position.y).toBeCloseTo(1)
    })
})
