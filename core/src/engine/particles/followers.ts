import type { Animation } from "../animation"
import type { Sprite } from "../gpu"
import { together } from "../animation"
import type { Point } from "../math"
import type { ParticleSystem } from "./ParticleSystem"

/** How a particle led along a path looks. */
export interface Follower {
    readonly system: ParticleSystem
    readonly sprite?: Sprite|null

    /** Is the sprite drawn mirrored, its left on the right? */
    readonly mirrored?: boolean

    /** The color as `0xRRGGBB`, white by default. */
    readonly color?: number

    /** The side of a square, or the width of a sprite, in pixels. */
    readonly size: number

    /** The opacity at its fullest, from 0 to 1: 1 by default. */
    readonly opacity?: number

    /** The angle at the start, in radians. */
    readonly rotation?: number

    /** The turn each second, in radians. */
    readonly spin?: number

    /** The time it takes along the path, in seconds. */
    readonly duration: number

    /** Where it is, at a progress from 0 to 1 and an age in seconds. */
    readonly path: (progress: number, age: number) => Point

    /** Called each frame with where it is. */
    readonly step?: (at: Point, dt: number) => void

    /** Called once when it arrives. */
    readonly arrived?: (at: Point) => void
}

/** The share of the way, at each end, over which a follower appears and fades. */
const FADE = 0.12

/**
 * A single particle led along a path: it appears, goes, and fades. The system keeps it alive and draws it,
 * the animation only tells where it stands from frame to frame. The particle is emitted when it starts.
 */
export function follow(spec: Follower): Animation {
    const { system, path, duration } = spec
    let handle = 0
    let age = 0
    return {
        start(){
            age = 0
            const start = path(0, 0)
            const scratch = system.scratch.reset()
            scratch.x = start.x
            scratch.y = start.y
            scratch.sizeStart = spec.size
            scratch.sizeEnd = spec.size
            scratch.life = duration + 1
            scratch.rotation = spec.rotation ?? 0
            scratch.spin = spec.spin ?? 0
            scratch.sprite = spec.sprite ?? null
            scratch.mirrored = spec.mirrored ?? false
            const hex = spec.color ?? 0xffffff
            scratch.colorStart.set((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255, 0)
            scratch.colorEnd.set((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255, 0)
            handle = system.emit(scratch)
        },
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
        end(){},
    }
}

/** A part of an object made of particles. */
export interface Part {
    readonly size: number
    readonly color: number
    readonly sprite?: Sprite|null

    /** Where it lies from the middle of the object, in pixels, at an age in seconds. */
    readonly offset: (age: number) => Point
}

/** An object made of particles that go along a same path, each at its own place from it. */
export function rigid(
    system: ParticleSystem, parts: readonly Part[], duration: number,
    path: (progress: number, age: number) => Point, opacity = 1,
): Animation {
    return together(parts.map(part => follow({
        system, size: part.size, color: part.color, sprite: part.sprite, duration, opacity,
        path: (progress, age) => {
            const at = path(progress, age)
            const off = part.offset(age)
            return { x: at.x + off.x, y: at.y + off.y }
        },
    })))
}
