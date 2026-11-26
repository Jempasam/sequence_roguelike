import type { Sprite } from "../../../../../engine/gpu"
import type { ParticleSystem } from "../../../../../engine/particles"
import type { AmbientPlay } from "./AmbientEffect"
import type { ParticlePoint } from "../ParticleContext"

/** A play that emits what it wants each frame for a time: `step` gets the last frame's time and its age. */
export function timed(duration: number, step: (dt: number, age: number) => void): AmbientPlay {
    let age = 0
    return {
        update(dt){
            age += dt
            step(dt, age)
            return age < duration
        },
    }
}

/** A play that does something at once and is over. */
export function once(run: () => void): AmbientPlay {
    return {
        update(){
            run()
            return false
        },
    }
}

/** Plays of which the effect is made, over when all are. */
export function together(plays: readonly AmbientPlay[]): AmbientPlay {
    let alive = [...plays]
    return {
        update(dt){
            alive = alive.filter(play => play.update(dt))
            return alive.length > 0
        },
    }
}

/** A play that waits, then makes another and plays it: what it emits starts when it is made. */
export function after(delay: number, make: () => AmbientPlay|null): AmbientPlay {
    let left = delay
    let play: AmbientPlay|null = null
    return {
        update(dt){
            if(left > 0){
                left -= dt
                return true
            }
            play ??= make()
            return play ? play.update(dt) : false
        },
    }
}

/** How a particle led along a path looks. */
export interface Follower {
    readonly system: ParticleSystem
    readonly sprite?: Sprite|null

    /** The color as `0xRRGGBB`, white by default. */
    readonly color?: number

    /** The side of a square, or the width of a sprite, in pixels. */
    readonly size: number

    /** The opacity at its fullest, from 0 to 1: 1 by default. */
    readonly opacity?: number

    /** The turn each second, in radians. */
    readonly spin?: number

    /** The time it takes along the path, in seconds. */
    readonly duration: number

    /** Where it is, at a progress from 0 to 1 and an age in seconds. */
    readonly path: (progress: number, age: number) => ParticlePoint

    /** Called each frame with where it is. */
    readonly step?: (at: ParticlePoint, dt: number) => void

    /** Called once when it arrives. */
    readonly arrived?: (at: ParticlePoint) => void
}

/** The share of the way, at each end, over which a follower appears and fades. */
const FADE = 0.12

/**
 * A single particle led along a path: it appears, goes, and fades. The system keeps it alive and draws it,
 * the play only tells where it stands from frame to frame.
 */
export function follow(spec: Follower): AmbientPlay {
    const { system, path, duration } = spec
    const start = path(0, 0)
    const scratch = system.scratch.reset()
    scratch.x = start.x
    scratch.y = start.y
    scratch.sizeStart = spec.size
    scratch.sizeEnd = spec.size
    scratch.life = duration + 1
    scratch.spin = spec.spin ?? 0
    scratch.sprite = spec.sprite ?? null
    const hex = spec.color ?? 0xffffff
    scratch.colorStart.set((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255, 0)
    scratch.colorEnd.set((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255, 0)
    const handle = system.emit(scratch)
    let age = 0
    return {
        update(dt){
            age += dt
            const progress = Math.min(1, age / duration)
            const at = path(progress, age)
            const fade = Math.min(1, progress / FADE, (1 - progress) / FADE)
            const opacity = Math.max(0, fade) * (spec.opacity ?? 1)
            if(!system.steer(handle, at.x, at.y, dt, opacity)) return false
            spec.step?.(at, dt)
            if(progress < 1) return true
            spec.arrived?.(at)
            return false
        },
    }
}

/** One of the items, drawn from the random. */
export function pick<T>(random: () => number, items: readonly T[]): T {
    return items[Math.min(items.length - 1, Math.floor(random() * items.length))]
}

/** Two different items, drawn from the random: both the same when there is one. */
export function pickTwo<T>(random: () => number, items: readonly T[]): [T, T] {
    const first = Math.min(items.length - 1, Math.floor(random() * items.length))
    if(items.length < 2) return [items[first], items[first]]
    let second = Math.min(items.length - 2, Math.floor(random() * (items.length - 1)))
    if(second >= first) second++
    return [items[first], items[second]]
}

/** How far past the edge of the interface a point out of the screen lies, in pixels. */
const OUTSIDE = 24

/**
 * A point just out of the interface, on a random edge, or on the edge nearest to a point.
 *
 * @param toward - Where the point leads to or comes from, none for any edge.
 */
export function outsidePoint(
    random: () => number, size: { readonly width: number, readonly height: number }, toward?: ParticlePoint,
): ParticlePoint {
    const { width, height } = size
    let edge = Math.floor(random() * 4)
    if(toward){
        const gaps = [toward.x, width - toward.x, toward.y, height - toward.y]
        edge = gaps.indexOf(Math.min(...gaps))
    }
    const across = random()
    if(edge === 0) return { x: -OUTSIDE, y: height * (0.15 + across * 0.7) }
    if(edge === 1) return { x: width + OUTSIDE, y: height * (0.15 + across * 0.7) }
    if(edge === 2) return { x: width * (0.15 + across * 0.7), y: -OUTSIDE }
    return { x: width * (0.15 + across * 0.7), y: height + OUTSIDE }
}

/** A part of an object made of particles. */
export interface Part {
    readonly size: number
    readonly color: number
    readonly sprite?: Sprite|null

    /** Where it lies from the middle of the object, in pixels, at an age in seconds. */
    readonly offset: (age: number) => ParticlePoint
}

/** An object made of particles that go along a same path, each at its own place from it. */
export function rigid(
    system: ParticleSystem, parts: readonly Part[], duration: number,
    path: (progress: number, age: number) => ParticlePoint, opacity = 1,
): AmbientPlay {
    return together(parts.map(part => follow({
        system, size: part.size, color: part.color, sprite: part.sprite, duration, opacity,
        path: (progress, age) => {
            const at = path(progress, age)
            const off = part.offset(age)
            return { x: at.x + off.x, y: at.y + off.y }
        },
    })))
}

/** Plays that start one after another, `gap` seconds apart: each is made when its turn comes. */
export function queue(count: number, gap: number, make: (index: number) => AmbientPlay|null): AmbientPlay {
    return together(Array.from({ length: count }, (_, index) => after(index * gap, () => make(index))))
}

/** The points of a broken line from a point to another, each pushed aside at random. */
export function jagged(
    random: () => number, from: ParticlePoint, to: ParticlePoint, segments: number, jitter: number,
): ParticlePoint[] {
    const points: ParticlePoint[] = []
    for(let index = 0; index <= segments; index++){
        const share = index / segments
        const edge = index === 0 || index === segments
        points.push({
            x: from.x + (to.x - from.x) * share + (edge ? 0 : (random() * 2 - 1) * jitter),
            y: from.y + (to.y - from.y) * share,
        })
    }
    return points
}

/** A point between two others, at a progress from 0 to 1. */
export function lerp(from: ParticlePoint, to: ParticlePoint, progress: number): ParticlePoint {
    return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress }
}
