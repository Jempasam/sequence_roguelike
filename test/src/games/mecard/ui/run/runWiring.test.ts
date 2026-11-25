import { describe, expect, test } from "vitest"
import "@game/core"
import { ALL_RUN_LOCKS, NO_RUN_LOCKS } from "@game/core/mecard/run-screen"
import type { RunLocks, RunScreen } from "@game/core/mecard/run-screen"
import { controlRun, locksForUnits, seatRun, viewRun } from "@game/core/mecard/run-wiring"
import { Forwarded } from "@game/core/mecard/forwarded"

import { started } from "../../sim/fixtures"
import { startedRun } from "../../../../fixtures/startedRun"

type Run = ReturnType<typeof startedRun>

// --- Fixture builders ---

/** What the wiring reads and writes of a screen. */
function fakeScreen(run: Run) {
    const followers: { engine: Run }[] = []
    const screen = {
        engine: run,
        locks: NO_RUN_LOCKS as RunLocks,
        follow: (follower: { engine: Run }) => {
            followers.push(follower)
            return () => { followers.splice(followers.indexOf(follower), 1) }
        },
    }
    return { screen: screen as unknown as RunScreen & typeof screen, followers }
}

// --- Tests ---

describe("runWiring", () => {
    test("no unit given → a spectator, everything locked", () => {
        expect(locksForUnits([])).toBe(ALL_RUN_LOCKS)
    })

    test("units given → only those are free to plan", () => {
        const battle = startedRun(3).newBattle()
        const [first, second] = battle.units
        const locks = locksForUnits([first!.name])
        expect(locks.battle.isLocked(first!)).toBe(false)
        expect(locks.battle.isLocked(second!)).toBe(true)
    })

    test("a seat on another run → the run is shown, its units alone are free", () => {
        const { screen } = fakeScreen(startedRun(3))
        const other = startedRun(4)
        seatRun(screen, other, [])
        expect(screen.engine).toBe(other)
        expect(screen.locks).toBe(ALL_RUN_LOCKS)
    })

    test("a run controlled alone → nothing locked, the run shown", () => {
        const { screen } = fakeScreen(startedRun(3))
        screen.locks = ALL_RUN_LOCKS
        const mine = startedRun(5)
        controlRun(screen, mine, null)
        expect(screen.engine).toBe(mine)
        expect(screen.locks).toBe(NO_RUN_LOCKS)
    })

    test("a run controlled with guests → their units locked", () => {
        const run = startedRun(3)
        const { screen } = fakeScreen(run)
        const [first, second] = started(run).units
        controlRun(screen, run, unit => unit.name === first!.name)
        expect(screen.locks.battle.isLocked(first!)).toBe(true)
        expect(screen.locks.battle.isLocked(second!)).toBe(false)
    })

    test("viewing with no sound → nothing followed, and stopping it is harmless", () => {
        const run = startedRun(3)
        const { screen, followers } = fakeScreen(run)
        const view = viewRun(run, screen, null, new Forwarded(() => {}))
        expect(followers).toHaveLength(0)
        view.dispose()
    })
})
