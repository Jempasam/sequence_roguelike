import { describe, expect, test } from "vitest"
import { ParticleSystem, seededRandom } from "@game/core"
import type { Sprite } from "@game/core"
import { AmbientDirector } from "@game/core/mecard/ambient"
import { AMBIENT_EFFECTS } from "@game/core/mecard/ambient-effects"
import { follow, timed } from "@game/core/mecard/ambient-plays"
import { BATTLE, GOBLIN } from "@game/core/mecard"
import type { Place } from "@game/core/mecard"
import { Forwarded } from "@game/core/mecard/forwarded"
import { RunParticleLink } from "@game/core/mecard/run-particle-link"
import { fightOf } from "../../../../../fixtures/fightFixtures"
import { startedRun } from "../../../../../fixtures/startedRun"

type Effect = (typeof AMBIENT_EFFECTS)[number]
type Map = Parameters<Effect["weight"]>[0]
type Fight = ReturnType<Map["fights"]>[number]

const SPRITE = {} as Sprite

function fightAt(x: number, y: number, visited = false): Fight {
    const type = fightOf(BATTLE, GOBLIN)
    const place: Place = { layer: 0, across: 0.5, next: [], exitTo: null, fight: type, halt: null }
    return { place, type, position: { x, y }, visited }
}

function mapOf(fights: readonly Fight[], over: Partial<Map> = {}): Map {
    return {
        fights: () => fights,
        halts: () => [],
        size: () => ({ width: 320, height: 240 }),
        heroPosition: () => ({ x: 50, y: 50 }),
        floor: () => ({}) as ReturnType<Map["floor"]>,
        sprite: () => SPRITE,
        coin: () => SPRITE,
        ...over,
    }
}

function particlesOf(): { alpha: ParticleSystem, additive: ParticleSystem, random: () => number } {
    return { alpha: new ParticleSystem(64), additive: new ParticleSystem(64), random: seededRandom(3) }
}

function effect(id: string): Effect {
    const found = AMBIENT_EFFECTS.find(each => each.id === id)
    if(!found) throw new Error(id)
    return found
}

describe("the director", () => {

    test("no effect allowed by the map → nothing plays", () => {
        const director = new AmbientDirector([effect("traveling-monster")], seededRandom(1), [1, 1])
        director.update(5, mapOf([]), particlesOf())
        expect(director.playing).toBe(0)
    })

    test("the wait is not over → nothing starts", () => {
        const director = new AmbientDirector([effect("bird-flock")], seededRandom(1), [5, 5])
        director.update(4, mapOf([]), particlesOf())
        expect(director.playing).toBe(0)
    })

    test("the wait is over → an allowed effect starts", () => {
        const director = new AmbientDirector([effect("bird-flock")], seededRandom(1), [5, 5])
        const particles = particlesOf()
        director.update(5, mapOf([]), particles)
        director.update(0.01, mapOf([]), particles)
        expect(particles.alpha.count).toBeGreaterThan(0)
    })

    test("as many effects as the limit play → none more starts", () => {
        const long = { id: "long", weight: () => 1, start: () => timed(100, () => {}) }
        const director = new AmbientDirector([long], seededRandom(1), [1, 1], 2)
        const particles = particlesOf()
        for(let i = 0; i < 10; i++) director.update(1, mapOf([]), particles)
        expect(director.playing).toBe(2)
    })

    test("same seed → same effects in the same order", () => {
        const run = (): number[] => {
            const director = new AmbientDirector(AMBIENT_EFFECTS, seededRandom(9), [1, 3])
            const particles = particlesOf()
            const counts: number[] = []
            for(let i = 0; i < 40; i++){
                director.update(0.5, mapOf([fightAt(10, 10), fightAt(200, 100)]), particles)
                counts.push(particles.alpha.count + particles.additive.count)
            }
            return counts
        }
        expect(run()).toEqual(run())
    })

    test("stop → the effects playing are forgotten", () => {
        const long = { id: "long", weight: () => 1, start: () => timed(100, () => {}) }
        const director = new AmbientDirector([long], seededRandom(1), [1, 1])
        director.update(1, mapOf([]), particlesOf())
        director.stop()
        expect(director.playing).toBe(0)
    })
})

describe("a triggered wave", () => {

    test("effects asked → each is started at once, whatever the wait", () => {
        const director = new AmbientDirector([], seededRandom(1), [100, 100])
        const particles = particlesOf()
        const outcomes = director.trigger(mapOf([]), particles, [effect("bird-flock"), effect("shooting-star")])
        expect(outcomes.map(outcome => outcome.status)).toEqual(["lancé", "lancé"])
        expect(director.playing).toBe(2)
    })

    test("more effects than the limit → all are started anyway", () => {
        const director = new AmbientDirector([], seededRandom(1), [100, 100], 1)
        const asked = [effect("bird-flock"), effect("bird-flock"), effect("bird-flock")]
        director.trigger(mapOf([]), particlesOf(), asked)
        expect(director.playing).toBe(3)
    })

    test("an effect the map does not allow → told, not started", () => {
        const director = new AmbientDirector([], seededRandom(1), [100, 100])
        const outcomes = director.trigger(mapOf([]), particlesOf(), [effect("traveling-monster")])
        expect(outcomes[0].status).toBe("impossible sur cette carte")
        expect(director.playing).toBe(0)
    })

    test("the party in a fight → the link refuses to start effects", () => {
        const run = startedRun(1)
        const place: Place = {
            layer: 1, across: 0.5, next: [], exitTo: null, fight: fightOf(BATTLE, GOBLIN), halt: null,
        }
        run.travel.jump(place)
        run.travel.journey.link(place, place)
        run.travel.go(place)
        run.travel.enter()
        const link = new RunParticleLink(run, new Forwarded(error => { throw error }), () => null)
        link.context = {} as NonNullable<RunParticleLink["context"]>
        expect(() => link.ambientNow([effect("bird-flock")])).toThrow()
    })
})

describe("the traveling monster", () => {

    test("a single fight → it cannot play", () => {
        expect(effect("traveling-monster").weight(mapOf([fightAt(1, 1)]))).toBe(0)
    })

    test("two fights → it emits one particle at the first fight, the sprite of its monster", () => {
        const particles = particlesOf()
        const play = effect("traveling-monster").start(mapOf([fightAt(10, 20), fightAt(200, 20)]), particles)
        expect(play).not.toBeNull()
        expect(particles.alpha.count).toBe(1)
    })

    test("sprites not loaded → it does not start", () => {
        const particles = particlesOf()
        const map = mapOf([fightAt(10, 20), fightAt(200, 20)], { sprite: () => null })
        expect(effect("traveling-monster").start(map, particles)).toBeNull()
    })

    test("its time is over → it arrived on the other fight, and the play ends", () => {
        const particles = particlesOf()
        const map = mapOf([fightAt(10, 20), fightAt(210, 20)])
        const play = effect("traveling-monster").start(map, particles)!
        let more = true
        let steps = 0
        while(more && steps++ < 1000){
            more = play.update(0.05)
            particles.alpha.update(0.05)
        }
        expect(more).toBe(false)
        expect(steps).toBeLessThan(200)
    })
})

describe("a followed particle", () => {

    test("it goes along the path → it ends where the path ends", () => {
        const system = new ParticleSystem(8)
        const play = follow({
            system, size: 4, duration: 1, path: progress => ({ x: progress * 100, y: 0 }),
        })
        for(let i = 0; i < 19; i++){
            play.update(0.05)
            system.update(0.05)
        }
        const out = { x: 0, y: 0 }
        system.positionOf(0, out)
        expect(out.x).toBeCloseTo(95, 0)
    })

    test("the system is full → the play ends at once, without error", () => {
        const system = new ParticleSystem(1)
        system.emit(system.scratch.reset())
        const play = follow({ system, size: 4, duration: 1, path: () => ({ x: 0, y: 0 }) })
        expect(play.update(0.05)).toBe(false)
    })
})

describe("the themed effects", () => {

    test("a floor without the theme → bats and embers cannot play", () => {
        const map = mapOf([fightAt(1, 1)])
        expect(effect("bats").weight(map)).toBe(0)
        expect(effect("embers").weight(map)).toBe(0)
        expect(effect("leaves").weight(map)).toBe(0)
        expect(effect("fog").weight(map)).toBe(0)
    })

    test("no boss on the map → the eye of the boss cannot play", () => {
        expect(effect("boss-eye").weight(mapOf([fightAt(1, 1)]))).toBe(0)
    })

    test("no fight won → the ghost cannot play", () => {
        expect(effect("defeated-ghost").weight(mapOf([fightAt(1, 1), fightAt(2, 2)]))).toBe(0)
    })

    test("a fight won and the party placed → the ghost can play", () => {
        expect(effect("defeated-ghost").weight(mapOf([fightAt(1, 1, true)]))).toBeGreaterThan(0)
    })
})
