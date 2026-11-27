import { describe, expect, test } from "vitest"
import { outsidePoint } from "@game/core-src/engine/math/points"
import { seededRandom } from "@game/core-src/engine/particles/random"
import { ALL_FLOORS } from "@game/core-src/games/mecard/sim/catalog/floors"
import { CAVE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/CaveFloor"
import { DOJO_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/DojoFloor"
import { HELL_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/HellFloor"
import { MINE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/MineFloor"
import { SWAMP_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/SwampFloor"
import { WEAVER_HALT } from "@game/core-src/games/mecard/sim/halt/subs/deck/WeaverHalt"
import { MERCHANT_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/MerchantHalt"
import { TAVERN_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/TavernHalt"
import { HOSPITAL_HALT } from "@game/core-src/games/mecard/sim/halt/subs/party/HospitalHalt"
import type { FloorType } from "@game/core-src/games/mecard/sim/floor/Floor"
import { AMBIENT_EFFECTS } from "@game/core/mecard/ambient-effects"
import { contextOf, effectOf, fightAt, haltAt, playOut, startedAnimation } from "../../../../../fixtures/ambientFixtures"

describe("the ids of the effects", () => {

    test("all the effects → a different id each", () => {
        const ids = AMBIENT_EFFECTS.map(each => each.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    test("all the effects but the backdrops → a spacing above 0", () => {
        for(const effect of AMBIENT_EFFECTS){
            if(effect.category !== "backdrop") expect(effect.spacing, effect.id).toBeGreaterThan(0)
        }
    })
})

describe("the signature effects", () => {

    test("a floor without a theme → none can play", () => {
        const context = contextOf([fightAt(10, 10), haltAt(TAVERN_HALT, 200, 100)])
        const playable = AMBIENT_EFFECTS.filter(each => each.category === "signature" && each.isPlayable(context))
        expect(playable.map(each => each.id)).toEqual([])
    })
})

describe("the effects tied to a halt", () => {

    test("no halt that a cart serves → the cart cannot play", () => {
        const context = contextOf([haltAt(HOSPITAL_HALT, 10, 10)], { floor: () => CAVE_FLOOR })
        expect(effectOf("leave-cart").isPlayable(context)).toBe(false)
    })

    test("a halt that sells → the cart can leave it, and it ends", () => {
        const context = contextOf([haltAt(MERCHANT_HALT, 100, 100)], { floor: () => CAVE_FLOOR })
        expect(effectOf("leave-cart").isPlayable(context)).toBe(true)
        expect(playOut("leave-cart", context)).toBeLessThan(500)
    })

    test("one halt that sells only → the cart cannot go from one halt to another", () => {
        const context = contextOf([haltAt(MERCHANT_HALT, 100, 100)], { floor: () => CAVE_FLOOR })
        expect(effectOf("swap-cart").isPlayable(context)).toBe(false)
    })

    test("two halts a cart serves → the cart goes from one to the other", () => {
        const context = contextOf([haltAt(MERCHANT_HALT, 50, 100), haltAt(WEAVER_HALT, 250, 100)], {
            floor: () => CAVE_FLOOR,
        })
        expect(effectOf("swap-cart").isPlayable(context)).toBe(true)
        expect(playOut("swap-cart", context)).toBeLessThan(500)
    })

    test("no halt of rest → the campfire cannot play", () => {
        const context = contextOf([haltAt(MERCHANT_HALT, 10, 10)], { floor: () => CAVE_FLOOR })
        expect(effectOf("campfire").isPlayable(context)).toBe(false)
    })

    test("a halt of rest → the campfire burns, then goes out", () => {
        const context = contextOf([haltAt(TAVERN_HALT, 100, 100)], { floor: () => CAVE_FLOOR })
        const frames = playOut("campfire", context)
        expect(frames).toBeGreaterThan(100)
        expect(frames).toBeLessThan(300)
    })
})

describe("the effects tied to the monsters", () => {

    test("no fight → no monster passes", () => {
        for(const id of ["leave-enemy", "enter-enemy"]){
            expect(effectOf(id).isPlayable(contextOf([], { floor: () => CAVE_FLOOR })), id).toBe(false)
        }
    })

    test("a fight → a monster passes, in or out of the screen", () => {
        for(const id of ["leave-enemy", "enter-enemy"]){
            const context = contextOf([fightAt(100, 100)], { floor: () => CAVE_FLOOR })
            expect(effectOf(id).isPlayable(context), id).toBe(true)
            expect(playOut(id, context), id).toBeLessThan(500)
        }
    })

    test("sprites not loaded → the line does not start", () => {
        const context = contextOf([fightAt(1, 1), fightAt(200, 100)], {
            floor: () => CAVE_FLOOR,
            sprite: () => null,
        })
        expect(effectOf("enemy-queue-between").effect.create(context)).toBeNull()
    })

    test("two fights → a line of monsters walks, one particle each, until all are done", () => {
        const context = contextOf([fightAt(1, 1), fightAt(200, 100)], { floor: () => CAVE_FLOOR })
        const animation = startedAnimation("enemy-queue-between", context)!
        animation.update(0.05)
        expect(context.alpha.count).toBe(1)
        for(let frame = 0; frame < 40; frame++){
            animation.update(0.05)
            context.alpha.update(0.05)
        }
        expect(context.alpha.count).toBeGreaterThan(1)
    })
})

describe("the effects tied to a floor", () => {

    test("a floor of another kind → lava, mine cart, petals, lightning and explosion cannot play", () => {
        const context = contextOf([fightAt(10, 10)], { floor: () => CAVE_FLOOR })
        for(const id of ["lava-geyser", "mine-cart", "cherry-petals", "lightning", "explosion"]){
            expect(effectOf(id).isPlayable(context), id).toBe(false)
        }
    })

    test("hell with a fight → lava and explosion can play", () => {
        const context = contextOf([fightAt(10, 10)], { floor: () => HELL_FLOOR })
        expect(effectOf("lava-geyser").isPlayable(context)).toBe(true)
        expect(effectOf("explosion").isPlayable(context)).toBe(true)
        playOut("lava-geyser", context)
        playOut("explosion", context)
    })

    test("hell with only a won fight → nothing blows up", () => {
        const context = contextOf([fightAt(10, 10, true)], { floor: () => HELL_FLOOR })
        expect(effectOf("explosion").isPlayable(context)).toBe(false)
    })

    test("the mine → the mine cart crosses the screen", () => {
        const context = contextOf([], { floor: () => MINE_FLOOR })
        expect(effectOf("mine-cart").isPlayable(context)).toBe(true)
        expect(playOut("mine-cart", context)).toBeLessThan(400)
    })

    test("the dojo → petals fall", () => {
        const context = contextOf([], { floor: () => DOJO_FLOOR })
        expect(effectOf("cherry-petals").isPlayable(context)).toBe(true)
        playOut("cherry-petals", context)
        expect(context.alpha.count).toBeGreaterThan(0)
    })

    test("the swamp → lightning lights the map, then is gone", () => {
        const context = contextOf([], { floor: () => SWAMP_FLOOR })
        expect(effectOf("lightning").isPlayable(context)).toBe(true)
        const animation = startedAnimation("lightning", context)!
        animation.update(0.05)
        expect(context.additive.count).toBeGreaterThan(5)
        for(let frame = 0; frame < 40; frame++){
            animation.update(0.05)
            context.additive.update(0.05)
        }
        expect(context.additive.count).toBe(0)
    })

    test("any floor → the whirl and the gust can play", () => {
        const context = contextOf([], { floor: () => CAVE_FLOOR })
        expect(effectOf("whirl").isPlayable(context)).toBe(true)
        expect(effectOf("gust").isPlayable(context)).toBe(true)
        playOut("whirl", context)
        playOut("gust", context)
    })
})

describe("the effects of each floor", () => {

    const places = [fightAt(100, 100), haltAt(TAVERN_HALT, 200, 100), haltAt(MERCHANT_HALT, 60, 60)]

    /** The ids of the effects a floor of this kind allows. */
    function playableOn(floor: FloorType): string[] {
        const context = contextOf(places, { floor: () => floor })
        return AMBIENT_EFFECTS.filter(effect => effect.isPlayable(context)).map(effect => effect.id)
    }

    test.each(ALL_FLOORS.map(floor => [floor.name, floor] as const))(
        "%s → at least 3 effects of its own, which all play to their end",
        (_name, floor) => {
            const common = new Set(playableOn({} as FloorType))
            const own = playableOn(floor).filter(id => !common.has(id))
            expect(own.length).toBeGreaterThanOrEqual(3)
            for(const id of own){
                expect(playOut(id, contextOf(places, { floor: () => floor })), id).toBeLessThan(2000)
            }
        },
    )
})

describe("a point out of the screen", () => {

    const size = { width: 320, height: 240 }

    test("any edge → it lies out of the interface", () => {
        const random = seededRandom(1)
        for(let index = 0; index < 50; index++){
            const { x, y } = outsidePoint(random, size)
            expect(x < 0 || x > size.width || y < 0 || y > size.height).toBe(true)
        }
    })

    test("toward a point near the left edge → the point is out on the left", () => {
        const { x } = outsidePoint(seededRandom(1), size, { x: 10, y: 120 })
        expect(x).toBeLessThan(0)
    })
})
