import { queue, timed } from "../../../../../../engine/animation"
import type { Animation } from "../../../../../../engine/animation"
import type { Sprite } from "../../../../../../engine/gpu"
import type { Point } from "../../../../../../engine/math"
import { burst, follow, Rate } from "../../../../../../engine/particles"
import { DUST, radial } from "../../../particles/recipes"
import type { AmbientContext } from "../AmbientContext"
import { lengthOf } from "./Route"
import type { PathOf } from "./Route"

/** What a traveler is told of a trip. */
export interface Trip {
    /** The sprites that make the trip, the first leading. */
    readonly sprites: readonly Sprite[]

    /** The path of the first one: the others follow it. */
    readonly path: PathOf

    /** How long the trip takes, in seconds. */
    readonly duration: number

    /** Does it end on a place, where it raises a puff of dust? Not when it leaves the screen. */
    readonly puff: boolean
}

/** What goes along a trip, and how. */
export interface Traveler {
    /** How fast it goes, in pixels per second: the time of a trip follows from its length. */
    readonly speed: number

    /** The animation of a trip, none when there is nothing to draw. */
    start(context: AmbientContext, trip: Trip): Animation|null
}

/** What a traveler leaves behind it: made once for each sprite, then told where it is on each frame. */
export type Trail = (context: AmbientContext) => (at: Point, dt: number) => void

/** How a procession of sprites looks and goes. */
export interface ProcessionStyle {
    readonly speed: number

    /** The width of the sprites, in pixels. */
    readonly size: number

    /**
     * The time between a sprite and the next, in seconds, when the trip goes at `speed`: the distance between
     * them is this time at that speed, kept whatever the real pace of the trip.
     */
    readonly gap: number

    /** How high the sprite is moved by, at an age in seconds: a hop, a sway, a rattle. */
    readonly bounce: (age: number) => number

    /** What it leaves behind it, nothing by default. */
    readonly trail?: Trail

    /** How wide the sprite of a rank is, and how high it sits above the path: `size` and 0 by default. */
    readonly body?: (index: number) => { readonly size: number, readonly lift: number }
}


// TRAILS //

/** The dust of a foot, raised at each step. */
export const DUST_TRAIL: Trail = context => {
    const rate = new Rate()
    return (at, dt) => {
        const count = rate.take(8, dt)
        if(count === 0) return
        const grain = { ...DUST, size: 2, end: 4, life: 0.6 }
        radial(context.alpha, context.random, { x: at.x, y: at.y + 6 }, count, grain, { speed: 6 })
    }
}

/** The foam of a hull, left on the water. */
export const WAKE_TRAIL: Trail = context => {
    const rate = new Rate()
    return (at, dt) => {
        const count = rate.take(10, dt)
        if(count === 0) return
        const foam = { from: 0xffffff, to: 0x9fd4ff, size: 2, end: 4, life: 0.9 }
        radial(context.alpha, context.random, { x: at.x, y: at.y + 7 }, count, foam, { speed: 4 })
    }
}

/** The sparks of wheels on rails. */
export const SPARK_TRAIL: Trail = context => {
    const rate = new Rate()
    return (at, dt) => {
        const count = rate.take(10, dt)
        if(count === 0) return
        const spark = { from: 0xffe08a, to: 0xff7a2a, size: 2, life: 0.3 }
        radial(context.additive, context.random, { x: at.x - 4, y: at.y + 7 }, count, spark, {
            speed: 30, angle: [-2.6, -0.5], gravity: 200,
        })
    }
}


// TRAVELERS //

/**
 * Sprites that go one behind another along the same path, the first leading: a monster, a party and its pets,
 * a cart and its horse, a boat. One sprite alone goes at once.
 */
export function procession(style: ProcessionStyle): Traveler {
    return {
        speed: style.speed,
        start(context, trip){
            if(trip.sprites.length === 0) return null
            const make = (index: number): Animation => {
                const trail = style.trail?.(context)
                const body = style.body?.(index) ?? { size: style.size, lift: 0 }
                return follow({
                    system: context.alpha,
                    sprite: trip.sprites[index],
                    size: body.size,
                    duration: trip.duration,
                    path: (progress, age) => {
                        const at = trip.path(progress, age)
                        return { x: at.x, y: at.y + style.bounce(age) - body.lift }
                    },
                    step: trail,
                    arrived: at => {
                        if(trip.puff) radial(context.alpha, context.random, at, 6, DUST, { speed: 25 })
                    },
                })
            }
            if(trip.sprites.length === 1) return make(0)
            const pace = lengthOf(trip.path) / trip.duration
            return queue(trip.sprites.length, style.gap * style.speed / pace, make)
        },
    }
}

/** A creature on foot: it hops at each step and raises dust. */
export const WALKER: Traveler = procession({
    speed: 43, size: 14, gap: 0.4, bounce: age => -Math.abs(Math.sin(age * 7)) * 3, trail: DUST_TRAIL,
})

/** A small party on foot, close behind its leader: a hero and its pets, a mechanic and its robots. */
export const COMPANY: Traveler = procession({
    speed: 43, size: 14, gap: 0.25, bounce: age => -Math.abs(Math.sin(age * 7)) * 3, trail: DUST_TRAIL,
})

/** A cart behind its horse: it rolls with small bumps. */
export const CART: Traveler = procession({
    speed: 33, size: 18, gap: 0.4, bounce: age => -Math.abs(Math.sin(age * 5)) * 1.2, trail: DUST_TRAIL,
})

/** A cart on rails, pushed by someone behind it: it rattles and throws sparks. */
export const MINE_CART: Traveler = procession({
    speed: 60, size: 16, gap: 0.2, bounce: age => Math.sin(age * 30) * 0.7, trail: SPARK_TRAIL,
})

/** A boat: it rocks on the water, and its hull leaves a wake. */
export const BOAT: Traveler = procession({
    speed: 30, size: 22, gap: 0.3, bounce: age => Math.sin(age * 2) * 1.6, trail: WAKE_TRAIL,
})

/** A boat with someone aboard: the second sprite stands on the first, smaller. */
export const CREWED_BOAT: Traveler = procession({
    speed: 30, size: 22, gap: 0.02, bounce: age => Math.sin(age * 2) * 1.6, trail: WAKE_TRAIL,
    body: index => index === 0 ? { size: 22, lift: 0 } : { size: 10, lift: 7 },
})

/** The time between two footprints, in seconds. */
const STEP = 0.4

/**
 * Footprints that appear one by one along the path, a left and a right foot, then fade. The first sprite
 * draws a print, none for a small square.
 */
export const PRINTS: Traveler = {
    speed: 40,
    start(context, trip){
        const sprite = trip.sprites[0] ?? null
        const total = Math.max(1, Math.floor(trip.duration / STEP))
        let left = 0
        let laid = 0
        return timed(trip.duration, dt => {
            left -= dt
            while(left <= 0 && laid < total){
                left += STEP
                const share = (laid + 1) / (total + 1)
                const here = trip.path(share, 0)
                const ahead = trip.path(Math.min(1, share + 0.01), 0)
                const dx = ahead.x - here.x
                const dy = ahead.y - here.y
                const length = Math.hypot(dx, dy) || 1
                const side = laid % 2 === 0 ? 1 : -1
                const x = here.x - dy / length * 2.5 * side
                const y = here.y + dx / length * 2.5 * side
                burst(context.alpha, context.random, x, y, 1, spec => {
                    spec.sprite = sprite
                    spec.life = 3
                    spec.sizeStart = sprite ? 5 : 2
                    spec.sizeEnd = sprite ? 5 : 2
                    spec.rotation = Math.atan2(dy, dx)
                    spec.colorStart.set(0.25, 0.18, 0.1, 0.6)
                    spec.colorEnd.set(0.25, 0.18, 0.1, 0)
                })
                laid++
            }
        })
    },
}
