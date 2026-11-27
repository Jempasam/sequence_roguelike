import { describe, expect, test } from "vitest"
import { follow } from "@game/core-src/engine/particles/followers"
import { ParticleSystem } from "@game/core-src/engine/particles/ParticleSystem"
import { seededRandom } from "@game/core-src/engine/particles/random"
import {
    AMBIENT_EFFECTS, ambientPools, runAmbient,
} from "@game/core/mecard/ambient-effects"
import { MINE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/MineFloor"
import { SWAMP_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/SwampFloor"
import { UPGRADE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/UpgradeFloor"
import { Ambient } from "@game/core/mecard/ambient-system"
import { AmbientOverlay } from "@game/core/mecard/ambient-overlay"
import { roundedScale, scaledContext } from "@game/core/mecard/ambient-scale"
import { densityAt, MAX_DENSITY } from "@game/core/mecard/ambient-spot"
import { isIndoors } from "@game/core/mecard/ambient-themes"
import { TravelAmbientContext } from "@game/core/mecard/travel-ambient-context"
import type { Travel } from "@game/core-src/games/mecard/sim/travel/Travel"
import {
    contextOf, effectOf, fightAt, playOut, startedAnimation,
} from "../../../../../fixtures/ambientFixtures"
import type { Context } from "../../../../../fixtures/ambientFixtures"

/** Run one tick of a component the way the interface does. */
function tick(overlay: AmbientOverlay, dt: number): void {
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

describe("a monster going from a fight to another", () => {

    test("a single fight → it cannot play", () => {
        expect(effectOf("swap-enemy").isPlayable(contextOf([fightAt(1, 1)]))).toBe(false)
    })

    test("two fights → it emits one particle at the first fight, the sprite of its monster", () => {
        const context = contextOf([fightAt(10, 20), fightAt(200, 20)])
        expect(effectOf("swap-enemy").isPlayable(context)).toBe(true)
        expect(startedAnimation("swap-enemy", context)).not.toBeNull()
        expect(context.alpha.count).toBe(1)
    })

    test("sprites not loaded → it does not start", () => {
        const context = contextOf([fightAt(10, 20), fightAt(200, 20)], { sprite: () => null })
        expect(effectOf("swap-enemy").effect.create(context)).toBeNull()
    })

    test("its time is over → it arrived on the other fight, and the animation ends", () => {
        const context = contextOf([fightAt(10, 20), fightAt(210, 20)])
        expect(playOut("swap-enemy", context)).toBeLessThan(200)
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

/** What the test changes of a space shown. */
interface Space {
    shown: boolean
    laidOut: boolean
    scene: object
    scale: number
}

/** An ambient over a space the test drives, holding two fights, and the space. */
function ambientOver(over: Partial<Context> = {}): { ambient: Ambient, space: Space, context: Context } {
    const ambient = new Ambient(seededRandom(4), error => { throw error })
    const space: Space = { shown: true, laidOut: true, scene: {}, scale: 1 }
    const base = contextOf([fightAt(40, 80), fightAt(200, 100)], over)
    const context: Context = {
        ...base,
        alpha: ambient.alpha,
        additive: ambient.additive,
        get scale(){ return space.scale },
        enabled: () => space.shown,
        settled: () => space.laidOut,
        scene: () => space.scene,
    }
    ambient.contexts = [context]
    return { ambient, space, context }
}

/** Move an ambient on, frame after frame of 50 ms. */
function frames(ambient: Ambient, count: number): void {
    for(let frame = 0; frame < count; frame++) ambient.update(0.05)
}

function particlesOf(ambient: Ambient): number {
    return ambient.alpha.count + ambient.additive.count
}

describe("an ambient over a space", () => {

    test("the space appears → an effect starts at once", () => {
        const { ambient } = ambientOver()
        frames(ambient, 40)
        expect(particlesOf(ambient)).toBeGreaterThan(0)
    })

    test("the space not laid out yet → nothing starts", () => {
        const { ambient, space } = ambientOver()
        space.laidOut = false
        frames(ambient, 100)
        expect(particlesOf(ambient)).toBe(0)
    })

    test("a flock in the air, then the space hidden → no particle stays", () => {
        const { ambient, space } = ambientOver()
        ambient.trigger([effectOf("bird-flock")])
        frames(ambient, 10)
        expect(particlesOf(ambient)).toBeGreaterThan(0)
        space.shown = false
        ambient.update(0.05)
        expect(particlesOf(ambient)).toBe(0)
    })

    test("another scene → what played is removed, then another effect starts", () => {
        const { ambient, space } = ambientOver()
        ambient.trigger([effectOf("bird-flock")])
        frames(ambient, 10)
        space.scene = {}
        space.laidOut = false
        ambient.update(0.05)
        expect(particlesOf(ambient)).toBe(0)
        space.laidOut = true
        frames(ambient, 40)
        expect(particlesOf(ambient)).toBeGreaterThan(0)
    })

    test("a frame of 10 seconds → the effects move on by 50 ms only", () => {
        const after = (dt: number): { count: number, first: { x: number, y: number } } => {
            const { ambient } = ambientOver()
            ambient.update(0.05)
            ambient.trigger([effectOf("bird-flock")])
            ambient.update(0.05)
            ambient.update(dt)
            const first = { x: 0, y: 0 }
            ambient.alpha.positionOf(0, first)
            return { count: ambient.alpha.count, first }
        }
        expect(after(10).count).toBeGreaterThan(0)
        expect(after(10)).toEqual(after(0.05))
    })

    test("no space enabled → effects asked are refused", () => {
        const { ambient, space } = ambientOver()
        space.shown = false
        expect(() => ambient.trigger([effectOf("bird-flock")])).toThrow()
    })

    test("a line of several sprites started by hand → it plays, though it emits nothing at its start", () => {
        const { ambient, space } = ambientOver()
        space.laidOut = false
        expect(ambient.trigger([effectOf("enemy-queue-edge-to-edge")])[0].status).toBe("started")
        space.laidOut = true
        const overlay = new AmbientOverlay(ambient)
        for(let frame = 0; frame < 40; frame++) tick(overlay, 0.05)
        expect(ambient.alpha.count).toBeGreaterThan(0)
    })
})

describe("the opening of a space", () => {

    /** The categories of the pools that play, after a space on a floor is opened. */
    function openedOn(seed: number, over: Partial<Context>): string[] {
        const effects = runAmbient(seededRandom(seed), error => { throw error })
        expect(effects.open(contextOf([fightAt(10, 10), fightAt(200, 100)], over, seed))).toBe(true)
        return effects.pools.filter(pool => pool.playing > 0).map(pool => pool.effects[0].category)
    }

    test("a floor with a backdrop → it opens with its backdrop and a signature or traffic", () => {
        for(let seed = 0; seed < 30; seed++){
            const opened = openedOn(seed, { floor: () => SWAMP_FLOOR })
            expect(opened).toHaveLength(2)
            expect(opened).toContain("backdrop")
            expect(opened.some(category => category === "signature" || category === "traffic")).toBe(true)
        }
    })

    test("a floor without a theme → it opens with traffic alone, never weather nor a surprise", () => {
        for(let seed = 0; seed < 30; seed++) expect(openedOn(seed, {})).toEqual(["traffic"])
    })
})

describe("the theme of a space", () => {

    test("closed edges → no trip by an edge, the trips between places still play", () => {
        const context = contextOf([fightAt(10, 10), fightAt(200, 100)], {
            openEdges: () => false, floor: () => MINE_FLOOR,
        })
        for(const id of ["edge-to-edge", "leave-enemy", "enter-enemy", "mine-cart"]){
            expect(effectOf(id).isPlayable(context), id).toBe(false)
        }
        expect(effectOf("swap-enemy").isPlayable(context)).toBe(true)
    })

    test("the map of an indoor floor → no sky, but its edges are open", () => {
        const unused = null as never
        const travel = (): Travel => ({ floor: { type: MINE_FLOOR } }) as unknown as Travel
        const map = new TravelAmbientContext(unused, unused, unused, travel, unused, unused, unused, unused)
        expect(map.outdoors()).toBe(false)
        expect(map.openEdges()).toBe(true)
    })

    test("indoors → neither weather nor sky", () => {
        const context = contextOf([], { outdoors: () => false, floor: () => SWAMP_FLOOR })
        for(const id of ["rain", "shooting-star", "lightning", "fog", "whirl", "gust"]){
            expect(effectOf(id).isPlayable(context), id).toBe(false)
        }
    })

    test("a workshop with the look of the cave → indoors", () => {
        expect(isIndoors(UPGRADE_FLOOR)).toBe(true)
        expect(isIndoors(SWAMP_FLOOR)).toBe(false)
    })
})

describe("the scale of a space", () => {

    test("a scale between two half steps → drawn at the nearest", () => {
        expect(roundedScale(0.97)).toBe(1)
        expect(roundedScale(2.6)).toBe(2.5)
        expect(roundedScale(0.1)).toBe(0.5)
    })

    test("twice as large → the effects see a space half as large", () => {
        const view = scaledContext(contextOf([fightAt(40, 80)], { scale: 2 }))
        expect(view.size()).toEqual({ width: 160, height: 120 })
        expect(view.places()[0].position).toEqual({ x: 20, y: 40 })
        expect(view.area()).toEqual({ x: 5, y: 10, width: 150, height: 100 })
    })

    test("seen from far → more things born, up to a limit; seen close → much fewer", () => {
        expect(densityAt(0.5, 2)).toBe(MAX_DENSITY)
        expect(densityAt(2, 2)).toBeCloseTo(0.25)
        expect(densityAt(2, 1)).toBeCloseTo(0.5)
        expect(densityAt(2, 0)).toBe(1)
    })

    test("snow seen close → fewer flakes", () => {
        const count = (scale: number): number => {
            const context = contextOf([], { scale })
            const animation = startedAnimation("snowfall", context)!
            for(let frame = 0; frame < 40; frame++) animation.update(0.05)
            return context.alpha.count
        }
        expect(count(2)).toBeLessThan(count(1))
    })

    test("snow seen from far → the flakes live long enough to cross the larger space", () => {
        const alive = (scale: number): number => {
            const context = contextOf([], { scale })
            const animation = startedAnimation("snowfall", context)!
            animation.update(0.05)
            for(let frame = 0; frame < 40; frame++) animation.update(0.05)
            const born = context.alpha.count
            // A little more than the longest life at scale 1.
            for(let frame = 0; frame < 320; frame++) context.alpha.update(0.05)
            return born > 0 ? context.alpha.count : -1
        }
        expect(alive(1)).toBe(0)
        expect(alive(0.5)).toBeGreaterThan(0)
    })
})
