import { describe, expect, test } from "vitest"
import { HALT_TYPES, PLACE_INFOS } from "@game/core/mecard"
import type { HaltKind } from "@game/core/mecard"
import { preparedRun, ScriptedPlayer, stateOf } from "../../../../fixtures/haltFixtures"

// --- Fixture builders ---

/** How many runs a halt is played on: enough for each to find something to work on. */
const SEEDS = 20

/** Every kind of halt, with its sort. */
const HALTS = Object.entries(HALT_TYPES).map(([kind, type]) => ({ kind: kind as HaltKind, type }))

// --- Tests ---

describe("HALT_TYPES", () => {
    test.each(HALTS)("$kind → told by its sort on the map", ({ kind, type }) => {
        expect(PLACE_INFOS[kind].name).toBe(type.name)
        expect(PLACE_INFOS[kind].description).toBe(type.description)
    })

    test.each(HALTS)("$kind → made of its own sort", ({ type }) => {
        expect(type.create(preparedRun(1)).type).toBe(type)
    })

    test.each(HALTS)("$kind → titled by its name, with something to say", ({ type }) => {
        const halt = type.create(preparedRun(1))
        expect(halt.title).toBe(type.name)
        expect(halt.line).not.toBe("")
    })

    test.each(HALTS)("$kind → no impact while the first dialog is left unanswered", ({ type }) => {
        const run = preparedRun(2)
        const halt = type.create(run)
        const before = stateOf(run)
        const player = new ScriptedPlayer(run)
        halt.start(player)
        halt.stop(player)
        expect(halt.hasImpact).toBe(false)
        expect(stateOf(run)).toBe(before)
    })

    test.each(HALTS)("$kind → the same first dialog when opened again", ({ type }) => {
        const run = preparedRun(3)
        const halt = type.create(run)
        const first = new ScriptedPlayer(run)
        halt.start(first)
        halt.stop(first)
        const again = new ScriptedPlayer(run)
        halt.start(again)
        expect(again.log).toEqual(first.log)
    })

    test.each(HALTS)("$kind → an impact exactly when the run changed", ({ type }) => {
        let impacts = 0
        for(let seed = 0; seed < SEEDS; seed++){
            const run = preparedRun(seed)
            const halt = type.create(run)
            const before = stateOf(run)
            const player = new ScriptedPlayer(run)
            halt.start(player)
            player.play()
            expect(halt.hasImpact, `seed ${seed}`).toBe(stateOf(run) !== before)
            if(halt.hasImpact) impacts++
        }
        expect(impacts).toBeGreaterThan(0)
    })
})
