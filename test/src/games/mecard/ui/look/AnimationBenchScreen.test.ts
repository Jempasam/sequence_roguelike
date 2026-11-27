import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core-src/games/mecard/sim/base/Vector2"
import { visual } from "@game/core-src/games/mecard/sim/base/Visual"
import { AnimationBenchScreen } from "@game/core/mecard/animation-bench"
import { DEFAULT_LOOK } from "@game/core/mecard/sprite-look"
import type { UnitSprites } from "@game/core/mecard/unit-sprites"
import { uiSetup } from "../../../../fixtures/uiFixtures"
import { settled } from "../battle/replay"

// --- Fixture builders ---

/** Sprites with no picture at all: every blow is drawn from its area. */
const NO_SPRITES = {
    of: () => null,
    look: () => DEFAULT_LOOK,
    whenLoaded: (listener: () => void) => listener(),
} as unknown as UnitSprites

/** A bench shown on a blow, over a fake interface. */
function opened() {
    const setup = uiSetup()
    const reported: string[] = []
    const bench = new AnimationBenchScreen(setup.theme, setup.ui, {
        report: text => reported.push(text),
        leave: () => {},
    }, NO_SPRITES)
    bench.visible = true
    bench.show(visual("slash"))
    setup.ui.render()
    return { ...setup, bench, reported }
}

/** One frame of the game: the bench is given the time, then the interface drawn, the chain let to go on. */
async function frame(game: ReturnType<typeof opened>, dt = 1 / 60): Promise<void> {
    game.bench.frame(dt)
    game.ui.render()
    await settled()
}

// --- Tests ---

describe("AnimationBenchScreen", () => {
    test("shown on a blow, frames going by → the blow played from its start to its end", async() => {
        const game = opened()
        await settled()
        const seen: number[] = []
        for(let step = 0; step < 120; step++){
            await frame(game)
            if(game.bench.progress !== null) seen.push(game.bench.progress)
        }
        expect(seen.length).toBeGreaterThan(2)
        expect(Math.max(...seen)).toBeGreaterThan(0.5)
        expect(seen.some(progress => progress > 0 && progress < 1)).toBe(true)
        expect(seen[seen.length - 1]).toBeGreaterThan(seen[0])
    })

    test("no frame given → the blow stays where it started", async() => {
        const game = opened()
        await settled()
        game.ui.update(1)
        game.ui.render()
        await settled()
        expect(game.bench.progress).toBe(0)
    })

    test("a blow played to its end and a pause gone by → struck again", async() => {
        const game = opened()
        await settled()
        let plays = 0
        let was: number|null = null
        for(let step = 0; step < 200; step++){
            await frame(game, 0.05)
            const { progress } = game.bench
            if(progress !== null && was === null) plays++
            was = progress
        }
        expect(plays).toBeGreaterThanOrEqual(2)
        expect(game.reported).toEqual([])
    }, 20000)

    test("paused → the blow held where it is, whatever the frames given", async() => {
        const game = opened()
        await settled()
        for(let step = 0; step < 4; step++) await frame(game)
        game.bench.togglePause()
        const held = game.bench.progress
        for(let step = 0; step < 30; step++) await frame(game)
        expect(game.bench.progress).toBe(held)
        game.bench.togglePause()
        for(let step = 0; step < 4; step++) await frame(game)
        expect(game.bench.progress).not.toBe(held)
    })

    test("a step → one frame of the blow let go by, the blow held", async() => {
        const game = opened()
        await settled()
        game.bench.togglePause()
        const before = game.bench.progress ?? 0
        game.bench.step()
        await settled()
        const after = game.bench.progress ?? 0
        expect(after).toBeGreaterThan(before)
        expect(after).toBeLessThan(0.5)
        for(let step = 0; step < 10; step++) await frame(game)
        expect(game.bench.progress).toBe(after)
    })

    test("the loop off → the blow played once and not again, until asked to", async() => {
        const game = opened()
        await settled()
        game.bench.toggleLoop()
        let plays = 0
        let was = game.bench.progress
        for(let step = 0; step < 120; step++){
            await frame(game, 0.05)
            const { progress } = game.bench
            if(progress !== null && was === null) plays++
            was = progress
        }
        expect(plays).toBe(0)
        expect(game.bench.progress).toBeNull()
        game.bench.play()
        await settled()
        expect(game.bench.progress).toBe(0)
    }, 20000)

    test.each(["Croix", "Croix en X"])("the shape %s chosen → two bars ending just past the reach", name => {
        const { bench } = opened()
        bench.showShape(name)
        const areas = bench.areasFrom(Vector2.ZERO, Vector2.RIGHT)
        expect(areas).toHaveLength(2)
        const farthest = Math.max(...areas.flatMap(area => area.map(point => point.x)))
        expect(farthest).toBeGreaterThanOrEqual(1.3)
        expect(farthest).toBeLessThan(1.6)
    })

    test.each(["Croix", "Croix en X"])("%s struck, the loop off → both bars played in turn, then over", async name => {
        const game = opened()
        game.bench.toggleLoop()
        game.bench.showShape(name)
        await settled()
        let plays = 1
        let was = 0
        for(let step = 0; step < 120; step++){
            await frame(game, 0.05)
            const { progress } = game.bench
            if(progress !== null && progress < was) plays++
            was = progress ?? was
        }
        expect(plays).toBe(2)
        expect(game.bench.progress).toBeNull()
        expect(game.reported).toEqual([])
    }, 20000)

    test("a bench never shown → no blow played", async() => {
        const setup = uiSetup()
        const host = { report: () => {}, leave: () => {} }
        const bench = new AnimationBenchScreen(setup.theme, setup.ui, host, NO_SPRITES)
        for(let step = 0; step < 30; step++){
            bench.frame(1 / 60)
            setup.ui.render()
            await settled()
        }
        expect(bench.progress).toBeNull()
    })
})
