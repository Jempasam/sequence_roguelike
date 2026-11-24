import type { Sprite } from "../../../../engine/gpu"
import { burst } from "../../../../engine/particles"
import type { ParticleSpec, ParticleSystem, Random } from "../../../../engine/particles"
import type { ParticlePoint } from "./ParticleContext"

// LOOKS //

/** How a particle looks and lives: its colors as `0xRRGGBB`, its sizes in pixels and its life in seconds. */
export interface Look {
    readonly from: number
    readonly to?: number
    readonly size: number
    readonly end?: number
    readonly life: number

    /** The share of the life a particle varies by, 0 for none. */
    readonly lifeSpread?: number

    /** Is the color gone at the end of the life? Yes by default. */
    readonly fades?: boolean

    /** Does a particle stretch along its motion? */
    readonly stretched?: boolean
    readonly sprite?: Sprite|null
}

/** Set a color from `0xRRGGBB` and an alpha. */
function paint(color: ParticleSpec["colorStart"], hex: number, alpha: number): void {
    color.set((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255, alpha)
}

/** Give a spec its look, the life varying with the random. */
function dress(spec: ParticleSpec, look: Look, random: Random): void {
    paint(spec.colorStart, look.from, 1)
    paint(spec.colorEnd, look.to ?? look.from, look.fades === false ? 1 : 0)
    spec.sizeStart = look.size
    spec.sizeEnd = look.end ?? look.size
    spec.life = look.life * (1 + (look.lifeSpread ?? 0) * (random() * 2 - 1))
    spec.faceMotion = look.stretched ?? false
    spec.sprite = look.sprite ?? null
}


// SHAPES //

/** How a radial burst moves. */
export interface Spread {
    /** The speed, in pixels per second, and how much it varies by, from 0 to 1. */
    readonly speed: number
    readonly speedSpread?: number

    /** The directions it goes in, in radians, all around by default. 0 is to the right, -PI/2 up. */
    readonly angle?: readonly [number, number]
    readonly gravity?: number
    readonly drag?: number
}

/** Throw particles out of a point. */
export function radial(
    system: ParticleSystem, random: Random, at: ParticlePoint, count: number, look: Look, spread: Spread,
): void {
    const [low, high] = spread.angle ?? [0, Math.PI * 2]
    burst(system, random, at.x, at.y, count, (spec, rand) => {
        dress(spec, look, rand)
        const angle = low + rand() * (high - low)
        const speed = spread.speed * (1 + (spread.speedSpread ?? 0.3) * (rand() * 2 - 1))
        spec.vx = Math.cos(angle) * speed
        spec.vy = Math.sin(angle) * speed
        spec.ay = spread.gravity ?? 0
        spec.drag = spread.drag ?? 0
    })
}

/** Throw particles up from a point, which float then fade. */
export function rise(
    system: ParticleSystem, random: Random, at: ParticlePoint, count: number, look: Look, width = 12,
    speed = 50,
): void {
    burst(system, random, at.x, at.y, count, (spec, rand) => {
        dress(spec, look, rand)
        spec.x += (rand() * 2 - 1) * width
        spec.vx = (rand() * 2 - 1) * 10
        spec.vy = -speed * (0.6 + rand() * 0.8)
    })
}

/** A circle of particles that goes out of a point, or comes into it when the speed is negative. */
export function ring(
    system: ParticleSystem, random: Random, at: ParticlePoint, count: number, radius: number, look: Look,
    speed: number,
): void {
    for(let index = 0; index < count; index++){
        const angle = (index + random()) / count * Math.PI * 2
        const x = Math.cos(angle)
        const y = Math.sin(angle)
        burst(system, random, at.x + x * radius, at.y + y * radius, 1, (spec, rand) => {
            dress(spec, look, rand)
            spec.vx = x * speed
            spec.vy = y * speed
        })
    }
}

/**
 * Fly particles from a point to another, bent aside by an arc, so they land on it at the end of their life.
 *
 * @param arc - How far the middle of the way is pushed aside, in pixels at most.
 */
export function fly(
    system: ParticleSystem, random: Random, from: ParticlePoint, to: ParticlePoint, count: number, look: Look,
    arc = 30,
): void {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy) || 1
    const sideX = -dy / length
    const sideY = dx / length
    burst(system, random, from.x, from.y, count, (spec, rand) => {
        dress(spec, look, rand)
        const time = spec.life
        const bend = (rand() * 2 - 1) * arc * 8 / (time * time)
        spec.ax = sideX * bend
        spec.ay = sideY * bend
        spec.vx = (dx - spec.ax * time * time / 2) / time
        spec.vy = (dy - spec.ay * time * time / 2) / time
    })
}

/** A streak of particles drawn across the interface, from the left edge to the right one. */
export function sweep(
    system: ParticleSystem, random: Random, width: number, height: number, count: number, look: Look,
): void {
    for(let index = 0; index < count; index++){
        burst(system, random, 0, random() * height, 1, (spec, rand) => {
            dress(spec, look, rand)
            spec.vx = width / spec.life
            spec.vy = (rand() * 2 - 1) * 10
        })
    }
}


// GOLD //

/** The gravity the coins fall under, in pixels per second squared. */
const COIN_GRAVITY = 300

/** The most coins one gain throws. */
const MAX_COINS = 14

/** How long a coin flies toward the counter, in seconds. */
const FLIGHT_TIME = 0.9

/** How long a coin tossed away lives, in seconds. */
const TOSS_TIME = 1

/** The side of a coin, in pixels. */
const COIN_SIZE = 7

/** How often a coin leaves a spark behind, in seconds. */
const TRAIL_STEP = 0.06

/** The coins thrown by a gain of gold, one per 5 gold on top of 4. */
export function coinCount(amount: number): number {
    return Math.min(MAX_COINS, 4 + Math.floor(Math.max(amount, 0) / 5))
}

/** The sparks of the coins landing: how long the coins fly. */
export const COINS_LANDING = FLIGHT_TIME

/**
 * Throw the coins of a gain of gold from a point: they land on the counter when there is one shown, else
 * they fall back where they were tossed. Each leaves sparks on its way, put by `trail` after a delay.
 */
export function throwCoins(
    system: ParticleSystem, random: Random, from: ParticlePoint, to: ParticlePoint|null, amount: number,
    coin: Sprite|null, trail: (delay: number, at: ParticlePoint) => void,
): void {
    burst(system, random, from.x, from.y, coinCount(amount), (spec, rand) => {
        spec.sprite = coin
        spec.sizeStart = COIN_SIZE
        spec.sizeEnd = COIN_SIZE
        paint(spec.colorStart, 0xffd34d, 1)
        paint(spec.colorEnd, 0xff9a1f, 1)
        spec.spin = (rand() * 2 - 1) * 12
        spec.ay = COIN_GRAVITY
        if(to){
            spec.life = FLIGHT_TIME * (1 + rand() * 0.3)
            spec.vx = (to.x - from.x) / spec.life
            spec.vy = (to.y - from.y) / spec.life - COIN_GRAVITY * spec.life / 2
        }
        else {
            const angle = (rand() * 2 - 1) * Math.PI / 3
            const speed = 90 + rand() * 70
            spec.life = TOSS_TIME * (0.9 + rand() * 0.3)
            spec.vx = Math.sin(angle) * speed
            spec.vy = -Math.cos(angle) * speed
        }
        for(let time = TRAIL_STEP; time < spec.life; time += TRAIL_STEP){
            trail(time, {
                x: spec.x + spec.vx * time,
                y: spec.y + spec.vy * time + COIN_GRAVITY * time * time / 2,
            })
        }
    })
}

/** A few sparks left by a coin. */
export function glint(system: ParticleSystem, random: Random, at: ParticlePoint): void {
    radial(system, random, at, 1, { from: 0xfff2b0, to: 0xffd34d, size: 2, life: 0.25 }, { speed: 0 })
}

/** A few sparks where the coins land, on the counter. */
export function sparkAt(system: ParticleSystem, random: Random, at: ParticlePoint): void {
    radial(system, random, at, 5, { from: 0xfff2b0, to: 0xffd34d, size: 3, end: 0, life: 0.3 }, { speed: 60 })
}


// LOOKS OF THE GAME //

/** What hurts: orange sparks. */
export const SPARK: Look = { from: 0xff5a3a, to: 0xff9a3a, size: 3, life: 0.25 }

/** The red of hearts. */
export const HEART_RED: Look = { from: 0xff5a6a, to: 0xff2a4a, size: 4, life: 0.5 }

/** The green of healing. */
export const HEAL_GREEN: Look = { from: 0x7dff9a, to: 0x2fbf5a, size: 4, end: 2, life: 0.9 }

/** The dust of what dies. */
export const DUST: Look = { from: 0x9a9aa8, to: 0x6a6a78, size: 5, end: 8, life: 0.9, lifeSpread: 0.2 }

/** A white spark, bright and short. */
export const FLASH: Look = { from: 0xffffff, to: 0xdff4ff, size: 2, life: 0.25, stretched: true }

/** The blue of cards. */
export const CARD_BLUE: Look = { from: 0xbfe6ff, to: 0x4a8cff, size: 3, end: 1, life: 0.7, lifeSpread: 0.15 }

/** The violet of items. */
export const ITEM_VIOLET: Look = {
    from: 0xd98cff, to: 0x6a2cff, size: 4, end: 0, life: 0.8, lifeSpread: 0.15,
}

/** The green of what may be used. */
export const USABLE_GREEN: Look = {
    from: 0x9dffb0, to: 0x18a84a, size: 3, end: 1, life: 0.8, lifeSpread: 0.15,
}

/** The gold of upgrades. */
export const UPGRADE_GOLD: Look = { from: 0xffd34d, to: 0xff9a1f, size: 4, end: 2, life: 0.7 }
