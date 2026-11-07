import { describe, expect, test } from "vitest"
import { allHalts, haltById, placeTypeById } from "@game/core/mecard"
import { preparedRun, ScriptedPlayer, stateOf } from "../../../../fixtures/haltFixtures"

// --- Fixture builders ---

/** How many runs a halt is played on: enough for each to find something to work on. */
const SEEDS = 20

/** Every sort of halt, by its id. */
const CASES = allHalts().map(type => ({ kind: type.id, type }))

// --- Tests ---

describe("halts", () => {
    test.each(CASES)("$kind → found again by its id", ({ kind, type }) => {
        expect(haltById(kind)).toBe(type)
        expect(placeTypeById(kind)).toBe(type)
    })

    test("ids → no two sorts of halt share one", () => {
        expect(new Set(allHalts().map(type => type.id)).size).toBe(allHalts().length)
    })

    test.each(CASES)("$kind → made of its own sort", ({ type }) => {
        expect(type.create(preparedRun(1)).type).toBe(type)
    })

    test.each(CASES)("$kind → titled by its name, with something to say", ({ type }) => {
        const halt = type.create(preparedRun(1))
        expect(halt.title).toBe(type.name)
        expect(halt.line).not.toBe("")
    })

    test.each(CASES)("$kind → no impact while the first dialog is left unanswered", ({ type }) => {
        const run = preparedRun(2)
        const halt = type.create(run)
        const before = stateOf(run)
        const player = new ScriptedPlayer(run)
        halt.start(player)
        halt.stop(player)
        expect(halt.hasImpact).toBe(false)
        expect(stateOf(run)).toBe(before)
    })

    test.each(CASES)("$kind → the same first dialog when opened again", ({ type }) => {
        const run = preparedRun(3)
        const halt = type.create(run)
        const first = new ScriptedPlayer(run)
        halt.start(first)
        halt.stop(first)
        const again = new ScriptedPlayer(run)
        halt.start(again)
        expect(again.log).toEqual(first.log)
    })

    test.each(CASES)("$kind → an impact exactly when the run changed", ({ type }) => {
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
