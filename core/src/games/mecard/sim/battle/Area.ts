import { Vector2 } from "../base/Vector2"

/**
 * A zone of the arena an effect covers: what an attack hits, where a hazard lies.
 *
 * - `circle`: everything within a radius of a point.
 * - `sector`: a slice of a circle, from its center toward a direction, as wide as `cosHalf` allows: the
 *   cosine of half its angle, so no trigonometry is needed to test it.
 * - `segment`: a band of a width along a line.
 * - `crescent`: what a sector leaves beyond a smaller radius, starting away from its center: a scythe. Its
 *   angle stays within what the middle of its outer arc sees, `cosHalf` at least `inner / radius`, so its
 *   outline fills as a fan from that middle.
 */
export type Area =
    | { readonly kind: "circle", readonly center: Vector2, readonly radius: number }
    | {
        readonly kind: "sector", readonly center: Vector2, readonly direction: Vector2,
        readonly radius: number, readonly cosHalf: number,
    }
    | { readonly kind: "segment", readonly from: Vector2, readonly to: Vector2, readonly width: number }
    | {
        readonly kind: "crescent", readonly center: Vector2, readonly direction: Vector2,
        readonly inner: number, readonly radius: number, readonly cosHalf: number,
    }

/**
 * Does a disc of a radius around a point touch an area? The disc counts whole, so a body touching the
 * outline drawn is touched, on every side.
 */
export function touches(area: Area, point: Vector2, radius: number): boolean {
    switch(area.kind){
        case "circle":
            return area.center.distance(point) <= area.radius + radius
        case "sector":
            return touchesSector(area, point, radius)
        case "segment":
            return distanceToSegment(point, area.from, area.to) <= area.width / 2 + radius
        case "crescent":
            // A disc wholly inside the inner radius passes under the blade.
            return area.center.distance(point) + radius >= area.inner && touchesSector(area, point, radius)
        default:
            return false
    }
}

/** What a sector and a crescent share: a slice of a circle. */
interface SectorShape {
    readonly center: Vector2
    readonly direction: Vector2
    readonly radius: number
    readonly cosHalf: number
}

/** Does a disc of a radius around a point touch a slice of a circle? */
function touchesSector(area: SectorShape, point: Vector2, radius: number): boolean {
    const offset = point.minus(area.center)
    const distance = offset.length
    if(distance > area.radius + radius) return false
    // Within the angle, a disc in reach touches the arc or what is inside it.
    if(distance > 0 && area.direction.dot(offset) / distance >= area.cosHalf) return true
    // Outside it, a disc touches only by one of the two straight edges, its center included.
    return sectorEdges(area.direction, area.cosHalf).some(edge => {
        const end = area.center.plus(edge.times(area.radius))
        return distanceToSegment(point, area.center, end) <= radius
    })
}

/** The cosine and the sine of each sixteenth of a turn, from 0, written out so no trigonometry is needed. */
const SIXTEENTHS: readonly (readonly [number, number])[] = (() => {
    const a = 0.9238795325112867
    const b = 0.7071067811865476
    const c = 0.3826834323650898
    const quarter: (readonly [number, number])[] = [[1, 0], [a, c], [b, b], [c, a]]
    // Each next quarter is the one before turned a quarter: (cos, sin) becomes (-sin, cos).
    const turns = [quarter]
    for(let i = 1; i < 4; i++) turns.push(turns[i - 1].map(([cos, sin]) => [-sin, cos] as const))
    return turns.flat()
})()

/** How wide an outline makes a segment of no width, in meters, so it still shows. */
const THIN = 0.05

/**
 * The outline of an area, a polygon in turn around it whose first point sees it whole: a circle is a sixteen
 * sided one, a sector its slice of it with its two edges exact, a segment the rectangle around it, a crescent
 * its two arcs, from the middle of the outer one.
 */
export function outline(area: Area): Vector2[] {
    switch(area.kind){
        case "circle":
            return SIXTEENTHS.map(([cos, sin]) => area.center.plus(new Vector2(cos, sin).times(area.radius)))
        case "sector":
            return sectorOutline(area.center, area.direction, area.radius, area.cosHalf)
        case "segment": {
            const along = area.to.minus(area.from).normalized ?? Vector2.UP
            const side = along.right.times(Math.max(area.width, THIN) / 2)
            return [area.from.minus(side), area.to.minus(side), area.to.plus(side), area.from.plus(side)]
        }
        case "crescent":
            return crescentOutline(area.center, area.direction, area.inner, area.radius, area.cosHalf)
        default:
            return []
    }
}

/**
 * The outline of a slice of a disc, a half disc at most: its center, then its arc from one edge to the
 * other.
 */
function sectorOutline(center: Vector2, direction: Vector2, radius: number, cosHalf: number): Vector2[] {
    return [center, ...arcOf(direction, cosHalf).map(point => center.plus(point.times(radius)))]
}

/** The outline of a crescent: from the middle of its outer arc, around it, and back along its inner arc. */
function crescentOutline(
    center: Vector2, direction: Vector2, inner: number, radius: number, cosHalf: number,
): Vector2[] {
    const arc = arcOf(direction, cosHalf)
    const middle = arc.findIndex(point => point.equals(direction))
    const outer = arc.map(point => center.plus(point.times(radius)))
    const back = arc.map(point => center.plus(point.times(inner))).reverse()
    return [...outer.slice(middle), ...back, ...outer.slice(0, middle)]
}

/**
 * The directions along the arc of a slice of a disc, a meter long: from the edge turned counterclockwise to
 * the other, through the direction of the slice.
 */
function arcOf(direction: Vector2, cosHalf: number): Vector2[] {
    const turned = (cos: number, sin: number) => turnedBy(direction, cos, sin)
    const [first, last] = sectorEdges(direction, cosHalf)
    const arc = [first]
    // The sixteenths strictly inside the slice, from the edge turned counterclockwise to the other.
    const inside = SIXTEENTHS
        .map(([cos, sin]) => ({ cos, sin }))
        .filter(({ cos }) => cos > cosHalf)
        .sort((first, second) => first.sin - second.sin)
    for(const { cos, sin } of inside) arc.push(turned(cos, sin))
    arc.push(last)
    return arc
}

/** A direction turned by an angle given by its cosine and sine, clockwise on an arena whose y goes down. */
function turnedBy(direction: Vector2, cos: number, sin: number): Vector2 {
    return new Vector2(direction.x * cos - direction.y * sin, direction.x * sin + direction.y * cos)
}

/** The directions of the two straight edges of a sector, a meter long: the counterclockwise one first. */
function sectorEdges(direction: Vector2, cosHalf: number): [Vector2, Vector2] {
    const sinHalf = Math.sqrt(1 - cosHalf * cosHalf)
    return [turnedBy(direction, cosHalf, -sinHalf), turnedBy(direction, cosHalf, sinHalf)]
}

/** How far a point lies from the closest point of a segment. */
export function distanceToSegment(point: Vector2, from: Vector2, to: Vector2): number {
    const along = to.minus(from)
    const squared = along.dot(along)
    if(squared === 0) return point.distance(from)
    const t = Math.min(1, Math.max(0, point.minus(from).dot(along) / squared))
    return point.distance(from.plus(along.times(t)))
}
