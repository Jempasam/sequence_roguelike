import { describe, expect, test } from "vitest"
import { follow, ParticleSystem, seededRandom } from "@game/core"
import { AMBIENT_EFFECTS, ambientPools } from "@game/core/mecard/ambient-effects"
import { BATTLE, GOBLIN } from "@game/core/mecard"
import type { Place } from "@game/core/mecard"
import { Forwarded } from "@game/core/mecard/forwarded"
import { RunParticleLink } from "@game/core/mecard/run-particle-link"
import { fightOf } from "../../../../../fixtures/fightFixtures"
import { startedRun } from "../../../../../fixtures/startedRun"
import { ParticleOverlay } from "@game/core/mecard/particle-overlay"
import {
    contextOf, effectOf, fightAt, playOut, SPRITE, startedAnimation,
} from "../../../../../fixtures/ambientFixtures"

/** Run one tick of a component the way the interface does. */
function tick(overlay: ParticleOverlay, dt: number): void {
    ;(overlay as unknown as { tick(dt: number): void }).tick(dt)
}

describe("a followed particle", () => {

    test("it goes along the path → it ends where the path ends", () => {
        const system = new ParticleSystem(8)
        const animation = follow({
            system, size: 4, duration: 1, path: progress => ({ x: progress * 100, y: 0 }),
        })
        animation.start()
        for(let i = 0; i < 19; i++){
            animation.update(0.05)
            system.update(0.05)
        }
        const out = { x: 0, y: 0 }
        system.positionOf(0, out)
        expect(out.x).toBeCloseTo(95, 0)
    })

    test("it is not started → it emits nothing", () => {
        const system = new ParticleSystem(8)
        follow({ system, size: 4, duration: 1, path: () => ({ x: 0, y: 0 }) })
        expect(system.count).toBe(0)
    })

    test("the system is full → the animation ends at once, without error", () => {
        const system = new ParticleSystem(1)
        system.emit(system.scratch.reset())
        const animation = follow({ system, size: 4, duration: 1, path: () => ({ x: 0, y: 0 }) })
        animation.start()
        expect(animation.update(0.05)).toBe(false)
    })
})

describe("the traveling monster", () => {

    test("a single fight → it cannot play", () => {
        expect(effectOf("traveling-monster").isPlayable(contextOf([fightAt(1, 1)]))).toBe(false)
    })

    test("two fights → it emits one particle at the first fight, the sprite of its monster", () => {
        const context = contextOf([fightAt(10, 20), fightAt(200, 20)])
        expect(effectOf("traveling-monster").isPlayable(context)).toBe(true)
        expect(startedAnimation("traveling-monster", context)).not.toBeNull()
        expect(context.alpha.count).toBe(1)
    })

    test("sprites not loaded → it does not start", () => {
        const context = contextOf([fightAt(10, 20), fightAt(200, 20)], { sprite: () => null })
        expect(effectOf("traveling-monster").effect.create(context)).toBeNull()
    })

    test("its time is over → it arrived on the other fight, and the animation ends", () => {
        const context = contextOf([fightAt(10, 20), fightAt(210, 20)])
        expect(playOut("traveling-monster", context)).toBeLessThan(200)
    })
})

describe("the themed effects", () => {

    test("a floor without the theme → bats, embers, leaves and fog cannot play", () => {
        const context = contextOf([fightAt(1, 1)])
        for(const id of ["bats", "embers", "leaves", "fog"]) expect(effectOf(id).isPlayable(context), id).toBe(false)
    })

    test("no boss on the map → the eye of the boss cannot play", () => {
        expect(effectOf("boss-eye").isPlayable(contextOf([fightAt(1, 1)]))).toBe(false)
    })

    test("no fight won → the ghost cannot play", () => {
        expect(effectOf("defeated-ghost").isPlayable(contextOf([fightAt(1, 1), fightAt(2, 2)]))).toBe(false)
    })

    test("a fight won and the party placed → the ghost can play", () => {
        expect(effectOf("defeated-ghost").isPlayable(contextOf([fightAt(1, 1, true)]))).toBe(true)
    })

    test("every effect → it has a weight above 0 when it is playable", () => {
        const context = contextOf([fightAt(1, 1), fightAt(2, 2, true)])
        for(const id of ["bird-flock", "cloud-shadow", "gust", "whirl", "shooting-star"]){
            expect(effectOf(id).weight(context), id).toBeGreaterThan(0)
        }
    })
})

describe("the animations of the ambient, over time", () => {

    test("the same seed → the same particles in the same order", () => {
        const run = (): number[] => {
            const counts: number[] = []
            for(const id of ["bird-flock", "whirl", "gust", "fireflies"]){
                const context = contextOf([fightAt(10, 10), fightAt(200, 100)], {}, 9)
                playOut(id, context)
                counts.push(context.alpha.count + context.additive.count)
            }
            return counts
        }
        expect(run()).toEqual(run())
    })
})

describe("the pools of the game", () => {

    test("every effect → it is in one pool and only one", () => {
        const pooled = ambientPools(seededRandom(1), error => { throw error }).flatMap(pool => pool.effects)
        expect(pooled).toHaveLength(AMBIENT_EFFECTS.length)
        expect(new Set(pooled)).toEqual(new Set(AMBIENT_EFFECTS))
    })
})

/** A link on the map of a started run, every place of the map shown, and no particle yet. */
function linkOnTheMap(): RunParticleLink {
    const run = startedRun(1)
    const forwarded = new Forwarded(error => { throw error })
    const link = new RunParticleLink(run, forwarded, () => null, seededRandom(4), () => SPRITE)
    const places = new Map(
        run.travel.journey.places.map((place, index) => [place, { x: 40 + index * 30, y: 80 }]),
    )
    link.context = {
        placePosition: place => places.get(place) ?? null,
        mapArea: () => ({ x: 20, y: 30, width: 280, height: 190 }),
        size: () => ({ width: 320, height: 240 }),
    } as NonNullable<RunParticleLink["context"]>
    return link
}

describe("the ambient on the map, with no particle alive", () => {

    test("a line of several sprites started by hand → it plays, though it emits nothing at its start", () => {
        const link = linkOnTheMap()
        expect(link.active).toBe(false)
        const outcome = link.ambientNow([effectOf("enemy-queue-edge-to-edge")])
        expect(outcome[0].status).toBe("started")
        const overlay = new ParticleOverlay(link)
        for(let frame = 0; frame < 40; frame++) tick(overlay, 0.05)
        expect(link.ambientAlpha.count).toBeGreaterThan(0)
    })

    test("the footprints started by hand → they appear, nothing being alive before", () => {
        const link = linkOnTheMap()
        expect(link.ambientNow([effectOf("footprints")])[0].status).toBe("started")
        const overlay = new ParticleOverlay(link)
        for(let frame = 0; frame < 40; frame++) tick(overlay, 0.05)
        expect(link.ambientAlpha.count).toBeGreaterThan(0)
    })

    test("a flock in the air, then the map left → no ambient particle stays", () => {
        const link = linkOnTheMap()
        link.ambientNow([effectOf("bird-flock")])
        const overlay = new ParticleOverlay(link)
        for(let frame = 0; frame < 10; frame++) tick(overlay, 0.05)
        expect(link.ambientAlpha.count).toBeGreaterThan(0)
        link.context = null
        tick(overlay, 0.05)
        expect(link.ambientAlpha.count + link.ambientAdditive.count).toBe(0)
    })

    test("long enough on the map → an effect starts by itself", () => {
        const link = linkOnTheMap()
        const overlay = new ParticleOverlay(link)
        let seen = false
        for(let frame = 0; frame < 4000 && !seen; frame++){
            tick(overlay, 0.05)
            seen = link.ambientAlpha.count + link.ambientAdditive.count > 0
        }
        expect(seen).toBe(true)
    })
})

describe("the link of a run to the ambient", () => {

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
        expect(() => link.ambientNow([effectOf("bird-flock")])).toThrow()
    })
})
