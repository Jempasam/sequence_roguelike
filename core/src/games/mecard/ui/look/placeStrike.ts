import { Vector2 } from "../../sim/base/Vector2"
import type { Area } from "../../sim/battle/Area"
import type { Hitbox } from "../../sim/battle/hitbox/Hitbox"
import { UNIT_RADIUS } from "../../sim/battle/Unit"

/** How many rays are cast through the area to measure its profile. */
export const PROFILE_RAYS = 16

/** The smallest spread, in radians, a blade can sweep: under it the area is a line, a blow only thrusts. */
export const MIN_SPREAD = 0.05

/** How far the middle of an area must lie from the attacker to point the way of the blow, in meters. */
const EPS = 1e-3

/** The least a blow reaches and spreads, in meters, so a sliver of an area still shows. */
const MIN_REACH = 0.1
const MIN_HALF_WIDTH = 0.05

/** Where the area lies along a ray from the attacker, in meters from it. */
export interface StrikeCut {
    /** The angle of the ray from the way of the blow, in radians, positive toward the right. */
    readonly angle: number

    /** Where the ray enters the area: 0 when the attacker stands inside it. */
    readonly inner: number

    /** Where the ray leaves it for the last time. */
    readonly outer: number
}

/** How a blow lies in the arena, read from its area: what a picture of it is placed and stretched by. */
export interface StrikePlacement {
    /** Where the attacker stood. */
    readonly origin: Vector2

    /** The way of the blow, in radians, as `Math.atan2` gives it for a vector of the arena. */
    readonly rotation: number

    /** The way of the blow, a meter long. */
    readonly forward: Vector2

    /** The middle of the area: where a blow that lands on it lands. */
    readonly center: Vector2

    /** How far the area goes ahead of the attacker, in meters. */
    readonly reach: number

    /** How far the area goes to either side, in meters. */
    readonly halfWidth: number

    /**
     * The widest angle between the way of the blow and a point of the area ahead of the attacker, in radians:
     * half a turn when the area lies around it.
     */
    readonly spread: number

    /**
     * The area along rays evenly spread from `-spread` to `+spread`, each in the middle of its share of the
     * angle, so none runs along an edge. Null where a ray misses the area.
     */
    readonly profile: readonly (StrikeCut | null)[]

    /** How many times larger than a unit of the base size the target is, 1 when there is none. */
    readonly impactScale: number
}

/**
 * Read a blow in the frame of its attacker, turned the way of the blow, whatever the shape of the area.
 *
 * @param origin - Where the attacker stood.
 * @param direction - Where the attacker looked: the way of the blow when the area lies around it.
 * @param target - The hitbox of a unit it touches, to scale an impact by.
 */
export function placeStrike(
    area: Area, origin: Vector2, direction: Vector2, target: Hitbox | null = null,
): StrikePlacement {

    // WAY //
    const middle = centerOf(area)
    const toward = middle === null ? null : middle.minus(origin)
    const around = toward === null || toward.length <= EPS
    const forward = (around ? direction.normalized : toward.normalized) ?? Vector2.UP
    const side = forward.right

    // MEASURES //
    let reach = 0
    let halfWidth = 0
    let spread = 0
    for(const point of area){
        const offset = point.minus(origin)
        const along = offset.dot(forward)
        const across = offset.dot(side)
        reach = Math.max(reach, along)
        halfWidth = Math.max(halfWidth, Math.abs(across))
        if(along > EPS) spread = Math.max(spread, Math.abs(Math.atan2(across, along)))
    }
    if(around) spread = Math.PI

    // PROFILE //
    const profile: (StrikeCut | null)[] = []
    for(let index = 0; index < PROFILE_RAYS; index++){
        const angle = -spread + 2 * spread * (index + 0.5) / PROFILE_RAYS
        profile.push(cut(area, origin, forward.rotated(Math.cos(angle), Math.sin(angle)), angle))
    }

    return {
        origin,
        rotation: Math.atan2(forward.y, forward.x),
        forward,
        center: middle ?? origin,
        reach: Math.max(reach, MIN_REACH),
        halfWidth: Math.max(halfWidth, MIN_HALF_WIDTH),
        spread,
        profile,
        impactScale: target === null ? 1 : target.reach / UNIT_RADIUS,
    }
}

/** The mean of the points of an area, null when it has none. */
function centerOf(area: Area): Vector2 | null {
    if(area.length === 0) return null
    let x = 0
    let y = 0
    for(const point of area){
        x += point.x
        y += point.y
    }
    return new Vector2(x / area.length, y / area.length)
}

/** Where a ray from a point crosses the area, null when it misses it. */
function cut(area: Area, origin: Vector2, ray: Vector2, angle: number): StrikeCut | null {
    const hits: number[] = []
    for(let index = 0; index < area.length; index++){
        const from = area[index]
        const edge = area[(index + 1) % area.length].minus(from)
        const denominator = ray.x * edge.y - ray.y * edge.x
        if(Math.abs(denominator) < 1e-9) continue
        const gap = from.minus(origin)
        const distance = (gap.x * edge.y - gap.y * edge.x) / denominator
        const along = (gap.x * ray.y - gap.y * ray.x) / denominator
        if(along < 0 || along >= 1 || distance < -1e-9) continue
        hits.push(Math.max(distance, 0))
    }
    if(hits.length === 0) return null
    hits.sort((one, other) => one - other)
    const outer = hits[hits.length - 1]
    const inner = hits.length % 2 === 1 ? 0 : hits[0]
    return { angle, inner, outer }
}
