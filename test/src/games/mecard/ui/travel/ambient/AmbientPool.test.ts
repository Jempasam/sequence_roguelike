import { describe, expect, test } from "vitest"
import { timed } from "@game/core-src/engine/animation/animations"
import { seededRandom } from "@game/core-src/engine/particles/random"
import type { Animation } from "@game/core-src/engine/animation/Animation"
import { AmbientEffect } from "@game/core/mecard/ambient-effect"
import { AmbientPool } from "@game/core/mecard/ambient-pool"
import { RunAmbient } from "@game/core/mecard/ambient"
import { contextOf } from "../../../../../fixtures/ambientFixtures"

/** What an effect lived through, with a clock of its own told by the test. */
interface Lived {
    now: number
    readonly starts: number[]
    readonly ends: number[]
}

type Options = Partial<ConstructorParameters<typeof AmbientEffect>[0]>

/** An effect that lasts a time, and writes when its animations start and end. */
function lasting(id: string, duration: number, lived: Lived, options: Options = {}): AmbientEffect {
    return new AmbientEffect({
        id,
        category: "backdrop",
        spacing: 0,
        stackable: false,
        isPlayable: () => true,
        weight: () => 1,
        effect: {
            create: () => {
                const inner = timed(duration, () => {})
                const animation: Animation = {
                    start(){
                        lived.starts.push(lived.now)
                        inner.start()
                    },
                    update: dt => inner.update(dt),
                    end(){
                        lived.ends.push(lived.now)
                    },
                }
                return animation
            },
        },
        ...options,
    })
}

function livedOf(): Lived {
    return { now: 0, starts: [], ends: [] }
}

/** Move a pool on second by second, telling the lived clock. */
function run(pool: AmbientPool, lived: Lived, seconds: number): void {
    const context = contextOf()
    for(let tick = 0; tick < seconds; tick++){
        lived.now = tick + 1
        pool.update(1, context)
    }
}

const REPORT = (error: unknown): void => { throw error }

describe("a pool of ambient effects", () => {

    test("nothing is playable → nothing plays", () => {
        const lived = livedOf()
        const pool = new AmbientPool([lasting("a", 3, lived, { isPlayable: () => false })], seededRandom(1), [1, 1], 2, REPORT)
        run(pool, lived, 20)
        expect(lived.starts).toEqual([])
    })

    test("the wait is not over → nothing starts", () => {
        const lived = livedOf()
        const pool = new AmbientPool([lasting("a", 3, lived)], seededRandom(1), [5, 5], 2, REPORT)
        run(pool, lived, 4)
        expect(lived.starts).toEqual([])
    })

    test("an effect that does not stack → the next waits for the end of the last, then for its spacing", () => {
        const lived = livedOf()
        const pool = new AmbientPool([lasting("a", 3, lived, { spacing: 5 })], seededRandom(1), [1, 1], 4, REPORT)
        run(pool, lived, 80)
        expect(lived.starts.length).toBeGreaterThan(2)
        lived.starts.slice(1).forEach((start, index) => {
            expect(start - lived.ends[index]).toBeGreaterThanOrEqual(5)
        })
    })

    test("an effect that stacks → several of it play at once, a spacing apart", () => {
        const lived = livedOf()
        const stacking = lasting("a", 30, lived, { spacing: 3, stackable: true })
        const pool = new AmbientPool([stacking], seededRandom(1), [1, 1], 5, REPORT)
        run(pool, lived, 40)
        expect(pool.playing).toBeGreaterThan(1)
        lived.starts.slice(1).forEach((start, index) => {
            expect(start - lived.starts[index]).toBeGreaterThanOrEqual(3)
        })
    })

    test("as many animations as the limit play → none more starts", () => {
        const lived = livedOf()
        const effects = ["a", "b", "c"].map(id => lasting(id, 1000, lived))
        const pool = new AmbientPool(effects, seededRandom(1), [1, 1], 2, REPORT)
        run(pool, lived, 40)
        expect(pool.playing).toBe(2)
    })

    test("the weights → an effect of weight 0 never starts", () => {
        const lived = livedOf()
        const never = lasting("never", 1, lived, { weight: () => 0 })
        const pool = new AmbientPool([never], seededRandom(1), [1, 1], 2, REPORT)
        run(pool, lived, 30)
        expect(lived.starts).toEqual([])
    })

    test("stop → what plays ends, once", () => {
        const lived = livedOf()
        const pool = new AmbientPool([lasting("a", 1000, lived)], seededRandom(1), [1, 1], 2, REPORT)
        run(pool, lived, 5)
        expect(pool.playing).toBe(1)
        pool.stop()
        pool.stop()
        expect(pool.playing).toBe(0)
        expect(lived.ends).toHaveLength(1)
    })

    test("stop in the middle of a wait → only what is left of it is waited", () => {
        const lived = livedOf()
        const pool = new AmbientPool([lasting("a", 1, lived)], seededRandom(1), [10, 10], 1, REPORT)
        run(pool, lived, 7)
        pool.stop()
        run(pool, lived, 3)
        expect(lived.starts).toEqual([3])
    })

    test("stop while an effect plays → its spacing is still waited", () => {
        const lived = livedOf()
        const pool = new AmbientPool([lasting("a", 1000, lived, { spacing: 100 })], seededRandom(1), [1, 1], 2, REPORT)
        run(pool, lived, 5)
        pool.stop()
        run(pool, lived, 50)
        expect(lived.starts).toHaveLength(1)
    })

    test("an animation that fails → its error is reported and the pool goes on", () => {
        const errors: unknown[] = []
        const failing = new AmbientEffect({
            id: "failing", category: "backdrop", spacing: 0, stackable: false, isPlayable: () => true,
            weight: () => 1,
            effect: { create: () => ({ start(){}, update(){ throw new Error("broken") }, end(){} }) },
        })
        const pool = new AmbientPool([failing], seededRandom(1), [1, 1], 1, error => errors.push(error))
        run(pool, livedOf(), 10)
        expect(errors.length).toBeGreaterThan(5)
        expect(pool.playing).toBeLessThanOrEqual(1)
    })
})

describe("effects started at once", () => {

    test("a playable effect → it starts whatever the wait, and the limit is not kept", () => {
        const lived = livedOf()
        const effect = lasting("a", 1000, lived)
        const pool = new AmbientPool([], seededRandom(1), [100, 100], 1, REPORT)
        const outcomes = pool.trigger(contextOf(), [effect, effect, effect])
        expect(outcomes.map(outcome => outcome.status)).toEqual(["started", "started", "started"])
        expect(pool.playing).toBe(3)
    })

    test("an effect the map does not allow → told unplayable, not started", () => {
        const lived = livedOf()
        const pool = new AmbientPool([], seededRandom(1), [100, 100], 1, REPORT)
        const outcomes = pool.trigger(contextOf(), [lasting("a", 1, lived, { isPlayable: () => false })])
        expect(outcomes[0].status).toBe("unplayable")
        expect(pool.playing).toBe(0)
    })

    test("an effect that finally cannot → told failed, not started", () => {
        const pool = new AmbientPool([], seededRandom(1), [100, 100], 1, REPORT)
        const cannot = new AmbientEffect({
            id: "cannot", category: "backdrop", spacing: 0, stackable: false, isPlayable: () => true,
            weight: () => 1,
            effect: { create: () => null },
        })
        expect(pool.trigger(contextOf(), [cannot])[0].status).toBe("failed")
        expect(pool.playing).toBe(0)
    })
})

describe("the pools of a run", () => {

    test("two pools → each keeps its own limit, so both play at once", () => {
        const lived = livedOf()
        const first = new AmbientPool([lasting("a", 1000, lived)], seededRandom(1), [1, 1], 1, REPORT)
        const second = new AmbientPool([lasting("b", 1000, lived)], seededRandom(2), [1, 1], 1, REPORT)
        const ambient = new RunAmbient([first, second])
        const context = contextOf()
        for(let tick = 0; tick < 20; tick++) ambient.update(1, context)
        expect(first.playing).toBe(1)
        expect(ambient.playing).toBe(2)
    })

    test("an effect asked → it is started by the pool that holds it", () => {
        const lived = livedOf()
        const held = lasting("held", 1000, lived)
        const first = new AmbientPool([], seededRandom(1), [1, 1], 1, REPORT)
        const second = new AmbientPool([held], seededRandom(2), [100, 100], 1, REPORT)
        const ambient = new RunAmbient([first, second])
        const outcomes = ambient.trigger(contextOf(), [held, lasting("lost", 1, lived)])
        expect(outcomes.map(outcome => outcome.status)).toEqual(["started", "unplayable"])
        expect(second.playing).toBe(1)
    })

    test("stop → every pool ends what it plays", () => {
        const lived = livedOf()
        const pool = new AmbientPool([lasting("a", 1000, lived)], seededRandom(1), [1, 1], 1, REPORT)
        const ambient = new RunAmbient([pool])
        const context = contextOf()
        for(let tick = 0; tick < 5; tick++) ambient.update(1, context)
        ambient.stop()
        expect(ambient.playing).toBe(0)
    })
})
