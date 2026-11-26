import type { Point } from "../../../../../../engine/math"
import { lerp } from "../../../../../../engine/math"
import type { Random } from "../../../../../../engine/particles"

/** Where a traveler is on its way, at a progress from 0 to 1 and an age in seconds. */
export type PathOf = (progress: number, age: number) => Point

/** What a route is drawn from: the ends of the trip, and the world it lies in. */
export interface RouteInput {
    readonly from: Point
    readonly to: Point
    readonly random: Random
    readonly size: { readonly width: number, readonly height: number }
}

/** How a trip goes from a point to another: the path it draws. */
export type Route = (input: RouteInput) => PathOf

/** How many points a path is measured with. */
const MEASURES = 128

/** A triangle wave of an angle, from -1 to 1: it turns sharply, where a sine turns softly. */
function zig(angle: number): number {
    return 2 / Math.PI * Math.asin(Math.sin(angle))
}

/** The straight line. */
export const straight: Route = ({ from, to }) => progress => lerp(from, to, progress)

/**
 * A zig-zag from a point to another: the traveler strays to one side and the other, and comes back on the
 * line at both ends, so it enters and leaves the places straight.
 */
export const wander: Route = ({ from, to, random }) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy) || 1
    const normal = { x: -dy / length, y: dx / length }

    // SMALL SCALE: a sharp zig-zag, a turn each 45 px //
    const reach = 7 + random() * 7
    const turns = Math.max(2, Math.round(length / 45))
    const phase = random() * Math.PI * 2
    const drift = random() * Math.PI * 2

    // LARGE SCALE: a soft wave, a swing each 90 to 200 px, its strength breathing slowly //
    const swings = Math.max(1, Math.round(length / (90 + random() * 110)))
    const sweep = 5 + random() * 5
    const swingPhase = random() * Math.PI * 2
    const breath = 0.5 + random()
    const breathPhase = random() * Math.PI * 2

    return uniform(progress => {
        const base = lerp(from, to, progress)
        const envelope = Math.sin(progress * Math.PI)
        const angle = progress * turns * Math.PI * 2
        const small = reach * (zig(angle + phase) + 0.4 * Math.sin(angle * 0.37 + drift))
        const strength = 0.8 + 0.2 * Math.sin(progress * breath * Math.PI * 2 + breathPhase)
        const large = sweep * strength * Math.sin(progress * swings * Math.PI * 2 + swingPhase)
        const side = envelope * (small + large)
        return { x: base.x + normal.x * side, y: base.y + normal.y * side }
    })
}

/**
 * A round that leaves a point and comes back to it: the traveler goes out, strolls around, and returns to
 * where it left from. Its end is not used.
 */
export const loop: Route = ({ from, random, size }) => {
    const radius = 22 + random() * 18
    const toCenter = Math.atan2(size.height / 2 - from.y, size.width / 2 - from.x)
    const heading = toCenter + (random() - 0.5) * 1.6
    const center = { x: from.x + Math.cos(heading) * radius, y: from.y + Math.sin(heading) * radius }
    const start = heading + Math.PI
    const turn = random() < 0.5 ? 1 : -1
    return uniform(progress => {
        const angle = start + turn * progress * Math.PI * 2
        const reach = radius * (1 + 0.35 * zig(progress * 3 * Math.PI * 2))
        return { x: center.x + Math.cos(angle) * reach, y: center.y + Math.sin(angle) * reach }
    })
}

/** The length of a path up to each of its measured points, the first being 0. */
function lengthsOf(path: PathOf): number[] {
    const lengths = [0]
    let last = path(0, 0)
    for(let index = 1; index <= MEASURES; index++){
        const next = path(index / MEASURES, 0)
        lengths.push(lengths[index - 1] + Math.hypot(next.x - last.x, next.y - last.y))
        last = next
    }
    return lengths
}

/**
 * The same way, gone at a constant speed: equal steps of progress cover equal distances, whatever the way
 * strays aside.
 */
export function uniform(path: PathOf): PathOf {
    const lengths = lengthsOf(path)
    const total = lengths[MEASURES]
    if(total <= 0) return path
    return (progress, age) => {
        const target = Math.min(1, Math.max(0, progress)) * total
        let low = 0
        let high = MEASURES
        while(high - low > 1){
            const middle = (low + high) >> 1
            if(lengths[middle] <= target) low = middle
            else high = middle
        }
        const span = lengths[high] - lengths[low]
        const share = span > 0 ? (target - lengths[low]) / span : 0
        return path((low + share) / MEASURES, age)
    }
}

/** How long a path is, in pixels, measured with a few points. */
export function lengthOf(path: PathOf): number {
    return lengthsOf(path)[MEASURES]
}
