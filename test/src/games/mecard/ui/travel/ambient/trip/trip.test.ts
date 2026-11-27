import { describe, expect, test } from "vitest"
import { seededRandom } from "@game/core-src/engine/particles/random"
import { HARBOR_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/HarborFloor"
import { MINE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/MineFloor"
import { DARK_TAVERN_HALT } from "@game/core-src/games/mecard/sim/halt/subs/dark/DarkTavernHalt"
import { CHEST_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/ChestHalt"
import { MAGICIAN_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/MagicianHalt"
import { TAVERN_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/TavernHalt"
import { MONSTER_SHAMAN_HALT } from "@game/core-src/games/mecard/sim/halt/subs/monster/MonsterShamanHalt"
import { AMBIENT_EFFECTS } from "@game/core/mecard/ambient-effects"
import { lengthOf, loop, straight, wander } from "@game/core/mecard/ambient-route"
import { contextOf, effectOf, fightAt, haltAt, playOut, SPRITE } from "../../../../../../fixtures/ambientFixtures"

const SIZE = { width: 320, height: 240 }

/** What a route is drawn from, between two points. */
const trip = (from: { x: number, y: number }, to: { x: number, y: number }) => ({
    from, to, random: seededRandom(3), size: SIZE,
})

describe("the routes of a trip", () => {

    test("a zig-zag → it starts and ends on the ends of the trip", () => {
        const from = { x: 20, y: 40 }
        const to = { x: 280, y: 160 }
        const path = wander(trip(from, to))
        expect(path(0, 0).x).toBeCloseTo(from.x, 5)
        expect(path(0, 0).y).toBeCloseTo(from.y, 5)
        expect(path(1, 0).x).toBeCloseTo(to.x, 5)
        expect(path(1, 0).y).toBeCloseTo(to.y, 5)
    })

    test("a zig-zag → it is longer than the straight line, and strays from it", () => {
        const from = { x: 20, y: 40 }
        const to = { x: 280, y: 40 }
        expect(lengthOf(wander(trip(from, to)))).toBeGreaterThan(lengthOf(straight(trip(from, to))))
        const strays = Array.from({ length: 20 }, (_, index) => wander(trip(from, to))(index / 20, 0).y)
        expect(Math.max(...strays.map(y => Math.abs(y - 40)))).toBeGreaterThan(1)
    })

    test("a zig-zag → equal steps of progress cover equal distances", () => {
        const from = { x: 20, y: 40 }
        const to = { x: 300, y: 200 }
        for(const seed of [1, 2, 3, 4]){
            const path = wander({ from, to, random: seededRandom(seed), size: SIZE })
            const steps: number[] = []
            for(let index = 0; index < 20; index++){
                let arc = 0
                let last = path(index / 20, 0)
                for(let part = 1; part <= 40; part++){
                    const next = path((index + part / 40) / 20, 0)
                    arc += Math.hypot(next.x - last.x, next.y - last.y)
                    last = next
                }
                steps.push(arc)
            }
            const mean = steps.reduce((sum, step) => sum + step, 0) / steps.length
            for(const step of steps) expect(Math.abs(step - mean) / mean).toBeLessThan(0.1)
        }
    })

    test("a zig-zag → each swing stays within the reach of both scales", () => {
        const from = { x: 20, y: 40 }
        const to = { x: 300, y: 40 }
        for(const seed of [1, 2, 3, 4]){
            const path = wander({ from, to, random: seededRandom(seed), size: SIZE })
            for(let index = 0; index <= 100; index++){
                expect(Math.abs(path(index / 100, 0).y - 40)).toBeLessThan(14 * 1.4 + 10 + 1)
            }
        }
    })

    test("a round → it comes back to the point it left", () => {
        const from = { x: 100, y: 100 }
        const path = loop(trip(from, from))
        expect(path(0, 0).x).toBeCloseTo(from.x, 5)
        expect(path(1, 0).x).toBeCloseTo(from.x, 5)
        expect(path(1, 0).y).toBeCloseTo(from.y, 5)
    })

    test("a round → it goes away from the point in between", () => {
        const from = { x: 100, y: 100 }
        const path = loop(trip(from, from))
        expect(Math.hypot(path(0.5, 0).x - from.x, path(0.5, 0).y - from.y)).toBeGreaterThan(10)
    })
})

describe("the effects of the halts", () => {

    test("every effect → its id is unique, and it has a weight when it plays", () => {
        const context = contextOf([
            haltAt(MAGICIAN_HALT, 80, 80), haltAt(TAVERN_HALT, 200, 120), fightAt(40, 200),
        ])
        const ids = AMBIENT_EFFECTS.map(each => each.id)
        expect(new Set(ids).size).toBe(ids.length)
        for(const effect of AMBIENT_EFFECTS){
            if(effect.isPlayable(context)) expect(effect.weight(context), effect.id).toBeGreaterThan(0)
        }
    })

    test("no halt of the family → none of its effects can play", () => {
        const context = contextOf([haltAt(TAVERN_HALT, 80, 80)])
        for(const id of ["stroll-magician", "leave-magician", "enter-magician", "swap-magician"]){
            expect(effectOf(id).isPlayable(context), id).toBe(false)
        }
    })

    test("one halt of the family → it strolls, leaves and enters, but cannot swap", () => {
        const context = contextOf([haltAt(MAGICIAN_HALT, 80, 80)])
        expect(effectOf("stroll-magician").isPlayable(context)).toBe(true)
        expect(effectOf("leave-magician").isPlayable(context)).toBe(true)
        expect(effectOf("enter-magician").isPlayable(context)).toBe(true)
        expect(effectOf("swap-magician").isPlayable(context)).toBe(false)
    })

    test("a halt with no fight beside it → its character strolls and comes back, then it ends", () => {
        const context = contextOf([haltAt(MAGICIAN_HALT, 80, 80)])
        expect(playOut("stroll-magician", context)).toBeLessThan(400)
    })

    test("sprites not loaded → a trip does not start", () => {
        const context = contextOf([haltAt(MAGICIAN_HALT, 80, 80)], { sprite: () => null })
        expect(effectOf("leave-magician").effect.create(context)).toBeNull()
    })

    test("the family has more itineraries open → each weighs less, the family weighing the same", () => {
        const one = contextOf([haltAt(MAGICIAN_HALT, 80, 80)])
        const two = contextOf([haltAt(MAGICIAN_HALT, 80, 80), haltAt(MAGICIAN_HALT, 200, 80)])
        const total = (context: typeof one): number => {
            return ["stroll", "leave", "enter", "swap"]
                .map(name => effectOf(`${name}-magician`))
                .filter(effect => effect.isPlayable(context))
                .reduce((sum, effect) => sum + effect.weight(context), 0)
        }
        expect(total(two)).toBeCloseTo(total(one), 5)
    })

    test("a halt that works with monsters → the monsters of the map walk out of it", () => {
        const context = contextOf([haltAt(DARK_TAVERN_HALT, 80, 80), fightAt(200, 100)])
        expect(effectOf("leave-enemy").isPlayable(context)).toBe(true)
        expect(effectOf("swap-enemy").isPlayable(context)).toBe(true)
        expect(playOut("swap-enemy", context)).toBeLessThan(500)
    })

    test("a halt of a monster and a fight on one place → the place holds both, and a trip leaves it", () => {
        const placed = haltAt(MONSTER_SHAMAN_HALT, 80, 80)
        const both = { ...placed, place: { ...placed.place, fight: fightAt(0, 0).place.fight } }
        const context = contextOf([both])
        expect(effectOf("leave-shaman").isPlayable(context)).toBe(true)
        expect(effectOf("leave-enemy").isPlayable(contextOf([both]))).toBe(true)
    })
})

describe("the groups", () => {

    test("a tavern → groups of kits come to it and leave it", () => {
        const context = contextOf([haltAt(TAVERN_HALT, 80, 80)])
        expect(effectOf("tavern-party-in").isPlayable(context)).toBe(true)
        expect(effectOf("tavern-party-out").isPlayable(context)).toBe(true)
        expect(effectOf("tavern-party-between").isPlayable(context)).toBe(false)
        expect(playOut("tavern-party-in", context)).toBeLessThan(600)
    })

    test("a dark tavern → groups of monsters of the catalog come to it", () => {
        const context = contextOf([haltAt(DARK_TAVERN_HALT, 80, 80)])
        expect(effectOf("all-monster-party-in").isPlayable(context)).toBe(true)
        expect(effectOf("tavern-party-in").isPlayable(context)).toBe(false)
    })

    test("two fights → the lines of the map can play, none without a fight", () => {
        const fights = contextOf([fightAt(10, 10), fightAt(200, 100)])
        expect(effectOf("enemy-queue-between").isPlayable(fights)).toBe(true)
        expect(effectOf("enemy-queue-edge-to-edge").isPlayable(fights)).toBe(true)
        const none = contextOf([haltAt(DARK_TAVERN_HALT, 10, 10)])
        expect(effectOf("enemy-queue-edge-to-edge").isPlayable(none)).toBe(false)
    })
})

describe("the pictures that are missing", () => {

    test("some pictures missing → a line goes on with the ones that exist", () => {
        let asked = 0
        const context = contextOf([fightAt(10, 10), fightAt(200, 100)], {
            sprite: () => asked++ % 2 === 0 ? null : SPRITE,
        })
        const animation = effectOf("enemy-queue-edge-to-edge").effect.create(context)
        expect(animation).not.toBeNull()
    })

    test("every picture missing → nothing starts", () => {
        const context = contextOf([fightAt(10, 10), fightAt(200, 100)], { sprite: () => null })
        expect(effectOf("enemy-queue-edge-to-edge").effect.create(context)).toBeNull()
    })
})

describe("the boats and the carts", () => {

    test("the harbor → the boats cross the screen", () => {
        const context = contextOf([], { floor: () => HARBOR_FLOOR })
        expect(effectOf("boat").isPlayable(context)).toBe(true)
        expect(effectOf("boat-fisher").isPlayable(context)).toBe(true)
        expect(playOut("boat", context)).toBeLessThan(600)
    })

    test("any other floor → no boat", () => {
        const context = contextOf([], { floor: () => MINE_FLOOR })
        expect(effectOf("boat").isPlayable(context)).toBe(false)
    })
})

describe("the things tossed out of the halts", () => {

    test("no halt that gives an item → nothing is tossed", () => {
        expect(effectOf("item-eject").isPlayable(contextOf([haltAt(TAVERN_HALT, 80, 80)]))).toBe(false)
    })

    test("a chest → an item is tossed out of it, falls, and the animation ends", () => {
        const context = contextOf([haltAt(CHEST_HALT, 80, 80)])
        expect(effectOf("item-eject").isPlayable(context)).toBe(true)
        expect(playOut("item-eject", context)).toBeLessThan(100)
    })

    test("sprites not loaded → nothing is tossed", () => {
        const context = contextOf([haltAt(CHEST_HALT, 80, 80)], { sprite: () => null })
        expect(effectOf("item-eject").effect.create(context)).toBeNull()
    })
})
