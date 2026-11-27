import { describe, expect, test } from "vitest"
import { Arena } from "@game/core-src/games/mecard/sim/battle/Arena"
import { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import { BattleSignals } from "@game/core-src/games/mecard/sim/battle/signals"
import { Observable } from "@game/core-src/lifetime/Observable"
import {
    BATTLE_FORWARDED, BATTLE_NOT_FORWARDED, RUN_FORWARDED, RUN_NOT_FORWARDED, TRAVEL_FORWARDED,
    TRAVEL_NOT_FORWARDED, battleForwardables, runForwardables, travelForwardables,
} from "@game/core/mecard/forwardables"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** The names of the observables a thing holds. */
function observablesOf(thing: object): string[] {
    return Object.entries(thing).filter(([, value]) => value instanceof Observable).map(([name]) => name)
}

// --- Tests ---

describe("forwardables", () => {
    test("every signal of a battle → forwarded", () => {
        const battle = new Battle(new Arena(7, 7), 1)
        const forwardables = battleForwardables(battle)
        for(const signal of Object.values(battle.signals)) expect(forwardables).toContain(signal)
        expect(battle.signals.all()).toHaveLength(Object.values(battle.signals).length)
        expect(battle.signals).toBeInstanceOf(BattleSignals)
    })

    test("every observable of a battle → forwarded or excluded by name", () => {
        const battle = new Battle(new Arena(7, 7), 1)
        const known = new Set<string>([...BATTLE_FORWARDED, ...BATTLE_NOT_FORWARDED])
        expect(observablesOf(battle).filter(name => !known.has(name))).toEqual([])
    })

    test("every observable of a travel → forwarded or excluded by name", () => {
        const run = startedRun(3)
        const known = new Set<string>([...TRAVEL_FORWARDED, ...TRAVEL_NOT_FORWARDED])
        expect(observablesOf(run.travel).filter(name => !known.has(name))).toEqual([])
        expect(travelForwardables(run.travel)).toHaveLength(TRAVEL_FORWARDED.length)
    })

    test("every observable of a run → forwarded or excluded by name", () => {
        const run = startedRun(3)
        const known = new Set<string>([...RUN_FORWARDED, ...RUN_NOT_FORWARDED])
        expect(observablesOf(run).filter(name => !known.has(name))).toEqual([])
        expect(runForwardables(run)).toHaveLength(RUN_FORWARDED.length)
    })
})
