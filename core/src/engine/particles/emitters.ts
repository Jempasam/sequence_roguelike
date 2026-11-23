import type { ParticleSystem } from "./ParticleSystem"
import type { Random } from "./random"
import type { ParticleSpec } from "./ParticleSpec"

/**
 * Describes one particle: the spec is already reset and placed at `(x, y)`, the function sets what is left,
 * taking from `random` what varies.
 */
export type Fill = (spec: ParticleSpec, random: Random, x: number, y: number) => void

/** How many tries a point inside a polygon gets, before the particle is given up. */
const INSIDE_TRIES = 16

/**
 * The count of particles an emitter owes, keeping what is left over between frames: 20 particles per
 * second at 60 frames per second gives 1 particle every third frame, not none.
 */
export class Rate {

    #rest = 0

    /** The whole number of particles to emit after `dt` seconds at `perSecond`; the fraction is kept. */
    public take(perSecond: number, dt: number): number {
        this.#rest += Math.max(perSecond, 0) * Math.max(dt, 0)
        const count = Math.floor(this.#rest)
        this.#rest -= count
        return count
    }
}

/** Emit `count` particles at once at a point. */
export function burst(
    system: ParticleSystem, random: Random, x: number, y: number, count: number, fill: Fill,
): void {
    for(let i = 0; i < count; i++) emitAt(system, random, x, y, fill)
}

/**
 * Emit particles at a rate inside a polygon, as a zone on the ground.
 *
 * @param polygon - The corners as `x0, y0, x1, y1, ...`, at least three.
 */
export function emitInside(
    system: ParticleSystem, random: Random, polygon: ArrayLike<number>, rate: Rate, perSecond: number,
    dt: number, fill: Fill,
): void {
    const count = rate.take(perSecond, dt)
    if(count === 0 || polygon.length < 6) return

    // BOX //
    let left = Infinity
    let top = Infinity
    let right = -Infinity
    let bottom = -Infinity
    for(let i = 0; i < polygon.length; i += 2){
        left = Math.min(left, polygon[i])
        right = Math.max(right, polygon[i])
        top = Math.min(top, polygon[i + 1])
        bottom = Math.max(bottom, polygon[i + 1])
    }

    // POINTS //
    for(let n = 0; n < count; n++){
        for(let attempt = 0; attempt < INSIDE_TRIES; attempt++){
            const x = left + random() * (right - left)
            const y = top + random() * (bottom - top)
            if(!isInside(polygon, x, y)) continue
            emitAt(system, random, x, y, fill)
            break
        }
    }
}

/**
 * Emit particles at a rate along a polyline, as a magic line.
 *
 * @param points - The points as `x0, y0, x1, y1, ...`, at least two.
 */
export function emitAlong(
    system: ParticleSystem, random: Random, points: ArrayLike<number>, rate: Rate, perSecond: number,
    dt: number, fill: Fill,
): void {
    emitPath(system, random, points, false, rate, perSecond, dt, fill)
}

/**
 * Emit particles at a rate along a closed outline, as the edge of a rectangle. A rectangle is a polygon of
 * four points.
 *
 * @param polygon - The corners as `x0, y0, x1, y1, ...`, at least three. The last joins the first.
 */
export function emitOutline(
    system: ParticleSystem, random: Random, polygon: ArrayLike<number>, rate: Rate, perSecond: number,
    dt: number, fill: Fill,
): void {
    emitPath(system, random, polygon, true, rate, perSecond, dt, fill)
}


// INTERNALS //

/** Reset the scratch spec of the system, place it, fill it and emit it. */
function emitAt(system: ParticleSystem, random: Random, x: number, y: number, fill: Fill): void {
    const spec = system.scratch.reset()
    spec.x = x
    spec.y = y
    fill(spec, random, x, y)
    system.emit(spec)
}

/** Emit along a path, each particle at a distance chosen evenly over the whole length. */
function emitPath(
    system: ParticleSystem, random: Random, points: ArrayLike<number>, closed: boolean, rate: Rate,
    perSecond: number, dt: number, fill: Fill,
): void {
    const count = rate.take(perSecond, dt)
    const pointCount = Math.floor(points.length / 2)
    if(count === 0 || pointCount < 2) return
    const segments = closed ? pointCount : pointCount - 1

    // LENGTH //
    let total = 0
    for(let s = 0; s < segments; s++) total += segmentLength(points, s, pointCount)
    if(total <= 0){
        burst(system, random, points[0], points[1], count, fill)
        return
    }

    // POINTS //
    for(let n = 0; n < count; n++){
        let remaining = random() * total
        let s = 0
        while(s < segments - 1 && remaining > segmentLength(points, s, pointCount)){
            remaining -= segmentLength(points, s, pointCount)
            s++
        }
        const length = segmentLength(points, s, pointCount)
        const share = length > 0 ? Math.min(remaining / length, 1) : 0
        const next = (s + 1) % pointCount
        const x = points[s * 2] + (points[next * 2] - points[s * 2]) * share
        const y = points[s * 2 + 1] + (points[next * 2 + 1] - points[s * 2 + 1]) * share
        emitAt(system, random, x, y, fill)
    }
}

/** The length of a segment of a path: from point `s` to the next one, which wraps around. */
function segmentLength(points: ArrayLike<number>, s: number, pointCount: number): number {
    const next = (s + 1) % pointCount
    return Math.hypot(points[next * 2] - points[s * 2], points[next * 2 + 1] - points[s * 2 + 1])
}

/** Is the point inside the polygon, by the even-odd rule? */
function isInside(polygon: ArrayLike<number>, x: number, y: number): boolean {
    let inside = false
    const count = polygon.length / 2
    for(let i = 0, j = count - 1; i < count; j = i++){
        const xi = polygon[i * 2]
        const yi = polygon[i * 2 + 1]
        const xj = polygon[j * 2]
        const yj = polygon[j * 2 + 1]
        if((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
    }
    return inside
}
