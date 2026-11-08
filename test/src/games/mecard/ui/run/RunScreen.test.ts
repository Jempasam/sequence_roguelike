import { describe, expect, test } from "vitest"
import { AssetError } from "@game/core"
import type { Assets } from "@game/core"

import { ALL_RUN_LOCKS, RunScreen } from "@game/core/mecard/run-screen"
import type { RunLocks, RunScreenOptions } from "@game/core/mecard/run-screen"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import { started } from "../../sim/fixtures"
import { settled } from "../battle/replay"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** Pictures that never load, whatever is asked for: no transition plays, what it hides changes at once. */
const NO_ASSETS = new Proxy({}, {
    get: () => (path: string) => Promise.reject(new AssetError(path, "unreadable", "none in the tests")),
}) as unknown as Assets

/** Units with no pictures. */
const NO_SPRITES = {
    of: () => null,
    cardBack: () => null,
    whenLoaded: () => {},
    load: () => Promise.resolve(),
} as unknown as RunScreenOptions["sprites"]

/** A screen on a new run, shown. */
function shown(locks?: RunLocks) {
    const setup = uiSetup({}, 620, 348)
    const run = startedRun(3)
    const screen = new RunScreen(setup.ui, run, {
        theme: setup.theme, assets: NO_ASSETS, sprites: NO_SPRITES, locks,
        toWorld: (x, y) => [x, y], toUi: (x, y) => [x, y],
        restart: () => {},
        report: () => {},
    })
    return { run, screen }
}

// --- Tests ---

describe("RunScreen", () => {
    test("a battle told by the run → shown, from the observable alone", async() => {
        const { run, screen } = shown()
        run.startBattle()
        expect(screen.battleScreen.visible).toBe(false)
        await settled()
        expect(screen.battleScreen.engine).toBe(run.battle)
        expect(screen.battleScreen.visible).toBe(true)
        expect(screen.travelScreen.visible).toBe(false)
    })

    test("a battle joined by a viewer → shown the same way, nothing started by the screen", async() => {
        const { run, screen } = shown(ALL_RUN_LOCKS)
        run.joinBattle(started(startedRun(5)).save())
        await settled()
        expect(screen.battleScreen.engine).toBe(run.battle)
        expect(screen.battleScreen.visible).toBe(true)
    })

    test("left before its way in ended → the map stays", async() => {
        const { run, screen } = shown()
        run.startBattle()
        run.backToMap()
        await settled()
        expect(screen.battleScreen.visible).toBe(false)
        expect(screen.travelScreen.visible).toBe(true)
    })
})
