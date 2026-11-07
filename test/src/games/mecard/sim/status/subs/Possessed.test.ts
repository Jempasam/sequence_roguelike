import { describe, expect, test } from "vitest"
import { Battle, POSSESSED, Run } from "@game/core/mecard"
import type { Unit } from "@game/core/mecard"

// --- Fixture builders ---

/** A first monster of a battle, with its deck in order. */
function monster(): { battle: Battle, unit: Unit } {
    const run = new Run(3)
    const battle = run.newBattle()
    const unit = battle.units.find(each => each.team === run.monstersTeam)
    if(!unit) throw new Error("No monster in the battle.")
    return { battle, unit }
}

// --- Tests ---

describe("Possessed", () => {
    test("applied → the deck no longer in order, as many cards drawn", () => {
        const { battle, unit } = monster()
        const { draw, firstDraw } = unit.stats
        const [before, firstBefore] = [draw.value, firstDraw.value]
        expect(unit.stats.ordered.value).toBe(true)
        battle.applyStatus(unit, POSSESSED, 1)
        expect(unit.stats.ordered.value).toBe(false)
        expect(draw.value).toBe(before)
        expect(firstDraw.value).toBe(firstBefore)
    })

    test("taken off → the deck in order again", () => {
        const { battle, unit } = monster()
        battle.applyStatus(unit, POSSESSED, 1)
        battle.removeStatus(unit, POSSESSED)
        expect(unit.stats.ordered.value).toBe(true)
    })

    test("a battle saved and loaded → still possessed, its modifier back", () => {
        const { battle, unit } = monster()
        battle.applyStatus(unit, POSSESSED, 1)
        const loaded = Battle.restore(battle.state())
        const same = loaded.units.find(each => each.name === unit.name)
        expect(same?.statuses.has(POSSESSED)).toBe(true)
        expect(same?.stats.ordered.value).toBe(false)
    })
})
