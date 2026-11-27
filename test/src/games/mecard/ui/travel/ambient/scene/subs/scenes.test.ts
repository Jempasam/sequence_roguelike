import { describe, expect, test } from "vitest"
import { CAVE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/CaveFloor"
import { DOJO_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/DojoFloor"
import { GRAVEYARD_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/GraveyardFloor"
import { HARBOR_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/HarborFloor"
import { SWAMP_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/SwampFloor"
import { TUNDRA_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/TundraFloor"
import { MERCHANT_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/MerchantHalt"
import type { FloorType } from "@game/core-src/games/mecard/sim/floor/Floor"
import { fromBeside, shower } from "@game/core-src/games/mecard/ui/travel/ambient/scene/subs/shower"
import type { ShowerSpec } from "@game/core-src/games/mecard/ui/travel/ambient/scene/subs/shower"
import { fixed } from "@game/core/mecard/ambient-spot"
import {
    contextOf, effectOf, fightAt, haltAt, playOut, startedAnimation,
} from "../../../../../../../fixtures/ambientFixtures"
import type { Context, Placed } from "../../../../../../../fixtures/ambientFixtures"

/** A context on a floor, over the places given. */
function on(floor: FloorType, places: readonly Placed[] = [], over: Partial<Context> = {}): Context {
    return contextOf(places, { floor: () => floor, ...over })
}

/** Play an effect to its end and tell the most particles it had alive at once. */
function mostAlive(id: string, context: Context): number {
    const animation = startedAnimation(id, context)!
    let most = 0
    for(let frame = 0; frame < 2000; frame++){
        const more = animation.update(0.05)
        most = Math.max(most, context.alpha.count + context.additive.count)
        context.alpha.update(0.05)
        context.additive.update(0.05)
        if(!more) break
    }
    animation.end()
    return most
}

describe("a drift", () => {

    test("a spot on the screen → it emits particles, then ends", () => {
        expect(mostAlive("snowfall", on(TUNDRA_FLOOR))).toBeGreaterThan(20)
    })

    test("a spot beside a halt, no halt → it cannot play", () => {
        expect(effectOf("sky-lanterns").isPlayable(on(DOJO_FLOOR, [fightAt(1, 1)]))).toBe(false)
    })

    test("a picture not loaded → it does not start", () => {
        const context = on(TUNDRA_FLOOR, [], { sprite: () => null })
        expect(effectOf("snowfall").effect.create(context)).toBeNull()
    })
})

describe("a glide", () => {

    test("its time is over → every shape crossed and the animation ends", () => {
        expect(mostAlive("sea-mist", on(HARBOR_FLOOR))).toBe(4)
    })

    test("a picture not loaded → it does not start", () => {
        const context = on(HARBOR_FLOOR, [], { sprite: () => null })
        expect(effectOf("sea-mist").effect.create(context)).toBeNull()
    })
})

describe("a swarm", () => {

    test("no fight → the flies cannot play", () => {
        expect(effectOf("flies").isPlayable(on(SWAMP_FLOOR))).toBe(false)
    })

    test("a fight → several beings turn around it, then are gone", () => {
        expect(mostAlive("flies", on(SWAMP_FLOOR, [fightAt(100, 100)]))).toBeGreaterThanOrEqual(5)
    })
})

describe("a flock", () => {

    test("it starts → one particle for each of its members", () => {
        const context = on(TUNDRA_FLOOR)
        startedAnimation("snow-geese", context)
        expect(context.alpha.count).toBeGreaterThanOrEqual(7)
        expect(context.alpha.count).toBeLessThanOrEqual(9)
    })

    test("its time is over → the animation ends", () => {
        expect(playOut("snow-geese", on(TUNDRA_FLOOR))).toBeLessThan(300)
    })
})

describe("a leap", () => {

    test("a bound starts → the being and its splash are drawn, then all ends", () => {
        const context = on(HARBOR_FLOOR)
        expect(mostAlive("leaping-fish", context)).toBeGreaterThan(5)
    })

    test("beside a fight, no fight → no toad hops", () => {
        expect(effectOf("leaping-frogs").isPlayable(on(SWAMP_FLOOR))).toBe(false)
    })
})

describe("a shower", () => {

    /** A single thing that rises 50 pixels in half a second onto a point, and sparks there. */
    const SINGLE: ShowerSpec = {
        grain: { colors: [0xffffff], size: [2, 2] },
        spot: fixed({ x: 100, y: 100 }), count: [1, 1], gap: 0, from: fromBeside([0, 0], [50, 50]),
        speed: [100, 100],
        splashes: [[
            { count: 5, glow: true, look: { from: 0xffffff, size: 1, life: 1 }, spread: { speed: 0 } },
        ]],
    }

    /** Move the animation of a spec on, and tell after how many frames of 50 ms it was over. */
    function framesOf(spec: ShowerSpec): number {
        const animation = shower(spec).create(contextOf())!
        animation.start()
        let frames = 1
        while(frames < 200 && animation.update(0.05)) frames++
        return frames
    }

    test("a thing on its way → no splash before it arrives, one once it did", () => {
        const context = contextOf()
        const animation = shower(SINGLE).create(context)!
        animation.start()
        for(let frame = 0; frame < 8; frame++){
            animation.update(0.05)
            context.alpha.update(0.05)
        }
        expect(context.additive.count).toBe(0)
        for(let frame = 0; frame < 4; frame++){
            animation.update(0.05)
            context.alpha.update(0.05)
        }
        expect(context.additive.count).toBe(5)
    })

    test("a bounce → it plays longer", () => {
        const bounce = { height: [5, 5], span: [5, 5], duration: 0.5 } as const
        expect(framesOf({ ...SINGLE, bounce })).toBeGreaterThan(framesOf(SINGLE) + 5)
    })

    test("something remains → it plays where the thing arrived, once it did", () => {
        const arrivals: unknown[] = []
        framesOf({
            ...SINGLE,
            remains: at => {
                arrivals.push(at)
                return { playable: () => true, create: () => null }
            },
        })
        expect(arrivals).toEqual([{ x: 100, y: 100 }])
    })

    test("a picture not loaded → it does not start", () => {
        const context = on(HARBOR_FLOOR, [], { sprite: () => null })
        expect(effectOf("hail").effect.create(context)).not.toBeNull()
        expect(effectOf("fire-rain").effect.create(context)).toBeNull()
    })

    test("beside a halt, no halt → it cannot play", () => {
        expect(effectOf("fireworks").isPlayable(on(DOJO_FLOOR, [fightAt(1, 1)]))).toBe(false)
    })
})

describe("an eruption", () => {

    test("a drop falls → its jets burst once it landed", () => {
        const context = on(CAVE_FLOOR, [fightAt(100, 100)])
        const animation = startedAnimation("rockfall", context)!
        animation.update(0.05)
        expect(context.alpha.count).toBe(4)
        for(let frame = 0; frame < 14; frame++) animation.update(0.05)
        expect(context.alpha.count).toBeGreaterThan(4)
    })

    test("a rising drop → its jets burst as it leaves", () => {
        const context = on(GRAVEYARD_FLOOR, [fightAt(100, 100)])
        const animation = startedAnimation("spectre-rise", context)!
        animation.update(0.05)
        expect(context.additive.count).toBeGreaterThan(5)
    })

    test("beside a fight, only a halt → it cannot play", () => {
        const context = on(CAVE_FLOOR, [haltAt(MERCHANT_HALT, 10, 10)])
        expect(effectOf("rockfall").isPlayable(context)).toBe(false)
    })
})
