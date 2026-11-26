import { describe, expect, test } from "vitest"
import {
    CAVE_FLOOR, DOJO_FLOOR, GRAVEYARD_FLOOR, HARBOR_FLOOR, MERCHANT_HALT, SWAMP_FLOOR, TUNDRA_FLOOR,
} from "@game/core/mecard"
import type { FloorType } from "@game/core/mecard"
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
