import { describe, expect, test } from "vitest"
import { AMBIENT_EFFECTS, runAmbient } from "@game/core/mecard/ambient-effects"
import { scaledContext } from "@game/core/mecard/ambient-scale"
import { seededRandom } from "@game/core-src/engine/particles/random"
import type { ParticleSystem } from "@game/core-src/engine/particles/ParticleSystem"
import { Tracked } from "@game/core-src/games/mecard/ui/travel/ambient/unit/Tracked"
import { CAVE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/CaveFloor"
import { FOREST_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/ForestFloor"
import { SWAMP_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/SwampFloor"
import { TUNDRA_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/TundraFloor"
import type { Animation } from "@game/core-src/engine/animation/Animation"
import type { FloorType } from "@game/core-src/games/mecard/sim/floor/Floor"
import {
    contextOf, effectOf, heroShown, petShown, playOut, startedAnimation,
} from "../../../../../../fixtures/ambientFixtures"
import type { Context, Shown } from "../../../../../../fixtures/ambientFixtures"

/** A context over units a test moves, on a floor. */
function spaceOf(units: Shown[], floor: FloorType = TUNDRA_FLOOR): Context {
    return contextOf([], { units: () => units, floor: () => floor })
}

/** Move an animation and its particles on, frame after frame of 50 ms: is it still going? */
function frames(animation: Animation, context: Context, count: number): boolean {
    let going = true
    for(let frame = 0; frame < count && going; frame++){
        going = animation.update(0.05)
        context.alpha.update(0.05)
        context.additive.update(0.05)
    }
    return going
}

/** Where the particles of a system are. */
function positionsOf(system: ParticleSystem): { x: number, y: number }[] {
    return Array.from({ length: system.count }, (_, index) => {
        const at = { x: 0, y: 0 }
        system.positionOf(index, at)
        return at
    })
}

/** Move a unit shown, its head with it. */
function moved(unit: Shown, dx: number): Shown {
    const { position, head } = unit
    return { ...unit, position: { x: position.x + dx, y: position.y }, head: { x: head.x + dx, y: head.y } }
}

describe("a unit followed", () => {

    test("it stays, then moves → still for a time, then moving", () => {
        const first = heroShown({ x: 10 })
        const tracked = new Tracked(first)
        tracked.update(0.5, [first])
        expect(tracked.stillFor).toBe(0.5)
        tracked.update(0.05, [moved(first, 3)])
        expect(tracked.moving).toBe(true)
        expect(tracked.stillFor).toBe(0)
        expect(tracked.shown.position.x).toBe(13)
    })

    test("it is not shown anymore → gone, where it was last", () => {
        const tracked = new Tracked(heroShown({ x: 10 }))
        tracked.update(0.05, [])
        expect(tracked.gone).toBe(true)
        expect(tracked.shown.position.x).toBe(10)
    })
})

describe("the effects of the units", () => {

    const CASES: readonly (readonly [string, FloorType])[] = [
        ["cold-breath", TUNDRA_FLOOR], ["snow-cap", TUNDRA_FLOOR], ["rain-splashes", SWAMP_FLOOR],
        ["head-lamp", CAVE_FLOOR], ["perching-bird", FOREST_FLOOR], ["curious-butterfly", FOREST_FLOOR],
        ["shy-wisp", SWAMP_FLOOR], ["coin-magpie", FOREST_FLOOR], ["weary-sweat", FOREST_FLOOR],
        ["last-heart-soul", FOREST_FLOOR], ["dozing", FOREST_FLOOR], ["whistling-hero", FOREST_FLOOR],
        ["footfall-puffs", FOREST_FLOOR], ["party-chatter", FOREST_FLOOR], ["firefly-relay", FOREST_FLOOR],
        ["coin-toss", FOREST_FLOOR], ["juggling", FOREST_FLOOR], ["pet-pat", FOREST_FLOOR],
    ]

    /** A party with a hero fresh, hurt, and on its last heart, and a pet. */
    const party = (): Shown[] => [
        heroShown({ x: 40 }), heroShown({ x: 56, full: 2 }), heroShown({ x: 72, full: 1 }), petShown(88),
    ]

    test("the category of the units → the effects of the cases, all of them", () => {
        const ids = AMBIENT_EFFECTS.filter(each => each.category === "unit").map(each => each.id)
        expect(ids.sort()).toEqual(CASES.map(([id]) => id).sort())
    })

    test.each(CASES)("%s over a party → it plays and ends", (id, floor) => {
        const context = spaceOf(party(), floor)
        expect(effectOf(id).isPlayable(context)).toBe(true)
        expect(playOut(id, context)).toBeLessThan(700)
    })

    test.each(CASES)("%s with no unit shown → it cannot play", (id, floor) => {
        expect(effectOf(id).isPlayable(spaceOf([], floor))).toBe(false)
    })

    test.each(CASES)("%s, then every unit gone → it ends without error", (id, floor) => {
        const units = party()
        const context = spaceOf(units, floor)
        const animation = startedAnimation(id, context)!
        frames(animation, context, 5)
        units.length = 0
        expect(frames(animation, context, 250)).toBe(false)
    })
})

describe("the snow on the heads", () => {

    test("a unit still → grains heap on its head", () => {
        const context = spaceOf([heroShown({ x: 40 })])
        frames(startedAnimation("snow-cap", context)!, context, 60)
        const grains = positionsOf(context.alpha)
        expect(grains.length).toBeGreaterThan(5)
        for(const { y } of grains) expect(y).toBeLessThanOrEqual(84.5)
    })

    test("the unit moves → the heap falls under its head", () => {
        const units = [heroShown({ x: 40 })]
        const context = spaceOf(units)
        const animation = startedAnimation("snow-cap", context)!
        frames(animation, context, 60)
        units[0] = moved(units[0], 5)
        frames(animation, context, 1)
        units[0] = moved(units[0], 5)
        frames(animation, context, 8)
        expect(positionsOf(context.alpha).some(({ y }) => y > 85)).toBe(true)
    })
})

describe("a bird on a head", () => {

    test("its unit stays → the bird sits on the head", () => {
        const context = spaceOf([heroShown({ x: 40 })], FOREST_FLOOR)
        frames(startedAnimation("perching-bird", context)!, context, 40)
        const [bird] = positionsOf(context.alpha)
        expect(bird.x).toBeCloseTo(40, 0)
        expect(bird.y).toBeLessThan(84)
        expect(bird.y).toBeGreaterThan(76)
    })

    test("its unit moves → the bird leaves, and the effect ends before its time", () => {
        const units = [heroShown({ x: 40 })]
        const context = spaceOf(units, FOREST_FLOOR)
        const animation = startedAnimation("perching-bird", context)!
        frames(animation, context, 40)
        units[0] = moved(units[0], 5)
        expect(frames(animation, context, 30)).toBe(false)
    })
})

describe("a unit dozing", () => {

    test("not still for a second yet → no letter", () => {
        const context = spaceOf([heroShown({ x: 40 })], FOREST_FLOOR)
        frames(startedAnimation("dozing", context)!, context, 18)
        expect(context.alpha.count).toBe(0)
    })

    test("it moves once asleep → an alarm over its head, then the effect ends", () => {
        const units = [heroShown({ x: 40 })]
        const context = spaceOf(units, FOREST_FLOOR)
        const animation = startedAnimation("dozing", context)!
        frames(animation, context, 80)
        units[0] = moved(units[0], 5)
        frames(animation, context, 1)
        const alarm = positionsOf(context.alpha).at(-1)!
        expect(alarm.x).toBeCloseTo(45, 0)
        expect(alarm.y).toBeLessThan(84)
        expect(frames(animation, context, 30)).toBe(false)
    })

    test("it moves before falling asleep → no alarm, it goes on waiting", () => {
        const units = [heroShown({ x: 40 })]
        const context = spaceOf(units, FOREST_FLOOR)
        const animation = startedAnimation("dozing", context)!
        frames(animation, context, 10)
        units[0] = moved(units[0], 5)
        expect(frames(animation, context, 5)).toBe(true)
        expect(context.alpha.count).toBe(0)
    })

    test("left alone → it sleeps for half a minute", () => {
        const context = spaceOf([heroShown({ x: 40 })], FOREST_FLOOR)
        const taken = playOut("dozing", context)
        expect(taken).toBeGreaterThan(600)
        expect(taken).toBeLessThan(640)
    })
})

describe("the soul of a unit on its last heart", () => {

    /** A hero whose feet are at 40 and 100, its picture 16 pixels high: its middle is at 92. */
    const dying = (): Shown => heroShown({ x: 40, full: 1 })

    /** The particles after a number of frames: the double upright and its eyes, then the one leaning. */
    function after(count: number): { x: number, y: number }[] {
        const context = spaceOf([dying()], FOREST_FLOOR)
        frames(startedAnimation("last-heart-soul", context)!, context, count)
        return positionsOf(context.alpha)
    }

    test("at first → it lies on the middle of its unit", () => {
        const [soul] = after(4)
        expect(soul.x).toBeCloseTo(40, 0)
        expect(soul.y).toBeCloseTo(92, 0)
    })

    test("two eyes → one on each side of it, over its middle", () => {
        const [soul, left, right] = after(4)
        expect(left.x).toBeLessThan(soul.x)
        expect(right.x).toBeGreaterThan(soul.x)
        for(const eye of [left, right]) expect(eye.y).toBeCloseTo(soul.y - 4, 0)
    })

    test("then it gets out → it is aside and higher, its eyes with it", () => {
        const [soul, left] = after(10)
        expect(Math.abs(soul.x - 40)).toBeCloseTo(3, 0)
        expect(soul.y).toBeLessThan(89.5)
        expect(left.y).toBeLessThan(soul.y)
    })

    test("each time it gets out → higher than the time before", () => {
        const [first] = after(10)
        const [last] = after(37)
        expect(last.y).toBeLessThan(first.y - 5)
    })

    test("at the end → it is pulled back on its unit, and the effect is over", () => {
        const context = spaceOf([dying()], FOREST_FLOOR)
        const animation = startedAnimation("last-heart-soul", context)!
        expect(frames(animation, context, 46)).toBe(false)
        const [soul] = positionsOf(context.alpha)
        expect(soul.x).toBeCloseTo(40, 0)
        expect(soul.y).toBeCloseTo(92, 0)
    })
})

describe("a unit juggling", () => {

    test("it moves → the thing is put back before its time", () => {
        const units = [heroShown({ x: 40 })]
        const context = spaceOf(units, FOREST_FLOOR)
        const animation = startedAnimation("juggling", context)!
        frames(animation, context, 10)
        units[0] = moved(units[0], 5)
        expect(frames(animation, context, 10)).toBe(false)
    })

    test("nothing carried → it cannot play", () => {
        const empty = petShown(40)
        expect(effectOf("juggling").isPlayable(spaceOf([empty], FOREST_FLOOR))).toBe(false)
    })

    test("pictures not loaded → it does not start", () => {
        const context = { ...spaceOf([heroShown({ x: 40 })], FOREST_FLOOR), sprite: () => null }
        expect(startedAnimation("juggling", context)).toBeNull()
    })
})

describe("the units of a space", () => {

    test("a space seen twice as large → heads and feet are halved, not the way faced", () => {
        const context = { ...spaceOf([heroShown({ x: 40 })]), scale: 2 }
        const [unit] = scaledContext(context).units()
        expect(unit.position).toEqual({ x: 20, y: 50 })
        expect(unit.head).toEqual({ x: 20, y: 42 })
        expect(unit.facing).toEqual({ x: 1, y: 0 })
    })

    test("a space opened with units → an effect of theirs starts at once", () => {
        for(let seed = 0; seed < 20; seed++){
            const effects = runAmbient(seededRandom(seed), error => { throw error })
            effects.open(spaceOf([heroShown({ x: 40 }), heroShown({ x: 56 })], FOREST_FLOOR))
            const playing = effects.pools.filter(pool => pool.playing > 0)
            expect(playing.map(pool => pool.effects[0].category)).toContain("unit")
        }
    })
})
