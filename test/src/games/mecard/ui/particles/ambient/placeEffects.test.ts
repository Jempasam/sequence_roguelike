import { describe, expect, test } from "vitest"
import { ParticleSystem, seededRandom } from "@game/core"
import type { Sprite } from "@game/core"
import {
    BATTLE, CAVE_FLOOR, DOJO_FLOOR, GOBLIN, HELL_FLOOR, MERCHANT_HALT, MINE_FLOOR, SWAMP_FLOOR, TAVERN_HALT,
} from "@game/core/mecard"
import type { FloorType, HaltType, Place } from "@game/core/mecard"
import { AMBIENT_EFFECTS } from "@game/core/mecard/ambient-effects"
import { outsidePoint } from "@game/core/mecard/ambient-plays"
import { fightOf } from "../../../../../fixtures/fightFixtures"

type Effect = (typeof AMBIENT_EFFECTS)[number]
type Map = Parameters<Effect["weight"]>[0]
type Fight = ReturnType<Map["fights"]>[number]
type Halt = ReturnType<Map["halts"]>[number]

const SPRITE = {} as Sprite

function fightAt(x: number, y: number, visited = false): Fight {
    const type = fightOf(BATTLE, GOBLIN)
    const place: Place = { layer: 0, across: 0.5, next: [], exitTo: null, fight: type, halt: null }
    return { place, type, position: { x, y }, visited }
}

function haltAt(type: HaltType, x: number, y: number): Halt {
    const place: Place = { layer: 0, across: 0.5, next: [], exitTo: null, fight: null, halt: type }
    return { place, type, position: { x, y } }
}

function mapOf(
    floor: FloorType, fights: readonly Fight[] = [], halts: readonly Halt[] = [], over: Partial<Map> = {},
): Map {
    return {
        fights: () => fights,
        halts: () => halts,
        size: () => ({ width: 320, height: 240 }),
        heroPosition: () => null,
        floor: () => floor,
        sprite: () => SPRITE,
        coin: () => SPRITE,
        ...over,
    }
}

function particlesOf(): { alpha: ParticleSystem, additive: ParticleSystem, random: () => number } {
    return { alpha: new ParticleSystem(512), additive: new ParticleSystem(512), random: seededRandom(5) }
}

function effect(id: string): Effect {
    const found = AMBIENT_EFFECTS.find(each => each.id === id)
    if(!found) throw new Error(id)
    return found
}

/** Play an effect to its end, in frames of 50 ms. */
function playOut(effectId: string, map: Map, particles = particlesOf()): number {
    const play = effect(effectId).start(map, particles)
    if(!play) throw new Error(`${effectId} did not start`)
    let frames = 0
    while(frames < 2000){
        frames++
        const more = play.update(0.05)
        particles.alpha.update(0.05)
        particles.additive.update(0.05)
        if(!more) break
    }
    return frames
}

describe("the ids of the effects", () => {

    test("all the effects → a different id each", () => {
        const ids = AMBIENT_EFFECTS.map(each => each.id)
        expect(new Set(ids).size).toBe(ids.length)
    })
})

describe("the effects tied to a halt", () => {

    test("no halt that sells → the cart cannot play", () => {
        expect(effect("merchant-cart").weight(mapOf(CAVE_FLOOR, [], [haltAt(TAVERN_HALT, 10, 10)]))).toBe(0)
    })

    test("a halt that sells → the cart can play, and it ends", () => {
        const map = mapOf(CAVE_FLOOR, [], [haltAt(MERCHANT_HALT, 100, 100)])
        expect(effect("merchant-cart").weight(map)).toBeGreaterThan(0)
        expect(playOut("merchant-cart", map)).toBeLessThan(500)
    })

    test("no halt of rest → the campfire cannot play", () => {
        expect(effect("campfire").weight(mapOf(CAVE_FLOOR, [], [haltAt(MERCHANT_HALT, 10, 10)]))).toBe(0)
    })

    test("a halt of rest → the campfire burns, then goes out", () => {
        const map = mapOf(CAVE_FLOOR, [], [haltAt(TAVERN_HALT, 100, 100)])
        const particles = particlesOf()
        const frames = playOut("campfire", map, particles)
        expect(frames).toBeGreaterThan(100)
        expect(frames).toBeLessThan(300)
    })
})

describe("the effects tied to the monsters", () => {

    test("no fight → no monster passes", () => {
        expect(effect("monster-passing").weight(mapOf(CAVE_FLOOR))).toBe(0)
    })

    test("a fight → a monster passes, in or out of the screen", () => {
        const map = mapOf(CAVE_FLOOR, [fightAt(100, 100)])
        expect(effect("monster-passing").weight(map)).toBeGreaterThan(0)
        expect(playOut("monster-passing", map)).toBeLessThan(500)
    })

    test("sprites not loaded → the line does not start", () => {
        const map = mapOf(CAVE_FLOOR, [fightAt(1, 1), fightAt(200, 100)], [], { sprite: () => null })
        expect(effect("monster-line").start(map, particlesOf())).toBeNull()
    })

    test("two fights → a line of monsters walks, one particle each, until all are done", () => {
        const map = mapOf(CAVE_FLOOR, [fightAt(1, 1), fightAt(200, 100)])
        const particles = particlesOf()
        const play = effect("monster-line").start(map, particles)!
        play.update(0.05)
        expect(particles.alpha.count).toBe(1)
        for(let frame = 0; frame < 40; frame++){
            play.update(0.05)
            particles.alpha.update(0.05)
        }
        expect(particles.alpha.count).toBeGreaterThan(1)
    })
})

describe("the effects tied to a floor", () => {

    test("a floor of another kind → lava, mine cart, petals, lightning and explosion cannot play", () => {
        const map = mapOf(CAVE_FLOOR, [fightAt(10, 10)])
        for(const id of ["lava-geyser", "mine-cart", "cherry-petals", "lightning", "explosion"]){
            expect(effect(id).weight(map), id).toBe(0)
        }
    })

    test("hell with a fight → lava and explosion can play", () => {
        const map = mapOf(HELL_FLOOR, [fightAt(10, 10)])
        expect(effect("lava-geyser").weight(map)).toBeGreaterThan(0)
        expect(effect("explosion").weight(map)).toBeGreaterThan(0)
        playOut("lava-geyser", map)
        playOut("explosion", map)
    })

    test("hell with only a won fight → nothing blows up", () => {
        expect(effect("explosion").weight(mapOf(HELL_FLOOR, [fightAt(10, 10, true)]))).toBe(0)
    })

    test("the mine → the mine cart crosses the screen", () => {
        const map = mapOf(MINE_FLOOR)
        expect(effect("mine-cart").weight(map)).toBeGreaterThan(0)
        expect(playOut("mine-cart", map)).toBeLessThan(400)
    })

    test("the dojo → petals fall", () => {
        const map = mapOf(DOJO_FLOOR)
        const particles = particlesOf()
        expect(effect("cherry-petals").weight(map)).toBeGreaterThan(0)
        playOut("cherry-petals", map, particles)
        expect(particles.alpha.count).toBeGreaterThan(0)
    })

    test("the swamp → lightning lights the map, then is gone", () => {
        const map = mapOf(SWAMP_FLOOR)
        const particles = particlesOf()
        expect(effect("lightning").weight(map)).toBeGreaterThan(0)
        const play = effect("lightning").start(map, particles)!
        play.update(0.05)
        expect(particles.additive.count).toBeGreaterThan(5)
        for(let frame = 0; frame < 40; frame++){
            play.update(0.05)
            particles.additive.update(0.05)
        }
        expect(particles.additive.count).toBe(0)
    })

    test("any floor → the whirl and the gust can play", () => {
        const map = mapOf(CAVE_FLOOR)
        expect(effect("whirl").weight(map)).toBeGreaterThan(0)
        expect(effect("gust").weight(map)).toBeGreaterThan(0)
        playOut("whirl", map)
        playOut("gust", map)
    })
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
