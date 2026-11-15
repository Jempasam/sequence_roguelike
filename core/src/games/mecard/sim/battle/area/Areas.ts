import { Vector2 } from "../../base/Vector2"
import type { Area } from "../Area"

/*
 * Everything about zones: building them, placing them, testing what they touch. An area is only a polygon, so
 * what an attack hits and what a preview draws are the same thing, with no case per shape. Import it whole:
 * `import * as Areas from "./area/Areas"`.
 */

/** The cosine and the sine of each thirty-second of a turn, from 0, written out: no trigonometry needed. */
const THIRTY_SECONDS: readonly (readonly [number, number])[] = (() => {
    const quarter: (readonly [number, number])[] = [
        [1, 0],
        [0.9807852804032304, 0.19509032201612825],
        [0.9238795325112867, 0.3826834323650898],
        [0.8314696123025452, 0.5555702330196022],
        [0.7071067811865476, 0.7071067811865476],
        [0.5555702330196022, 0.8314696123025452],
        [0.3826834323650898, 0.9238795325112867],
        [0.19509032201612825, 0.9807852804032304],
    ]
    // Each next quarter is the one before turned a quarter: (cos, sin) becomes (-sin, cos).
    const turns = [quarter]
    for(let i = 1; i < 4; i++) turns.push(turns[i - 1].map(([cos, sin]) => [-sin, cos] as const))
    return turns.flat()
})()

/** How wide a line of no width is made, in meters, so it still shows. */
const THIN = 0.05

/** A circle of a radius of half a meter around the origin, thirty-two sided. */
export const CIRCLE: Area = THIRTY_SECONDS.map(([cos, sin]) => new Vector2(cos / 2, sin / 2))

/** A square of half a meter on each side of the origin, so a meter wide and high. */
export const SQUARE: Area = [
    new Vector2(-0.5, -0.5), new Vector2(0.5, -0.5), new Vector2(0.5, 0.5), new Vector2(-0.5, 0.5),
]


// ---------------------------------------------------------------------------------------------- Building

/** A circle of a radius around a point. */
export function circle(center: Vector2, radius: number): Area {
    return scaled(CIRCLE, center, radius * 2, radius * 2)
}

/** A rectangle of a width and a height around a point, its height along the top of the arena. */
export function square(center: Vector2, height: number, width: number = height): Area {
    return scaled(SQUARE, center, width, height)
}

/**
 * A band of a width along a line, from a point to another. It goes on for half its width past each end, so
 * a line stopping on a body, as a shot does, still touches it, whatever the rounding. A line of no length
 * is a square, its sides along the top of the arena.
 */
export function line(from: Vector2, to: Vector2, width: number): Area {
    const half = Math.max(width, THIN) / 2
    const along = to.minus(from).normalized ?? Vector2.UP
    const side = along.right.times(half)
    const start = from.minus(along.times(half))
    const end = to.plus(along.times(half))
    return [start.minus(side), end.minus(side), end.plus(side), start.plus(side)]
}

/**
 * A slice of a disc, a half disc at most: from a center toward a forward direction, as wide as `cosHalf`
 * allows, the cosine of half its angle, so no trigonometry is needed. Its first point is its center.
 */
export function arc(center: Vector2, forward: Vector2, radius: number, cosHalf: number): Area {
    return [center, ...arcOf(forward, cosHalf).map(point => center.plus(point.times(radius)))]
}

/**
 * What an arc leaves beyond a smaller radius, starting away from its center: a scythe. Its angle stays within
 * what the middle of its outer arc sees, `cosHalf` at least `inner / radius`, so it fills as a fan from its
 * first point, the middle of its outer arc.
 */
export function crescent(
    center: Vector2, forward: Vector2, inner: number, radius: number, cosHalf: number,
): Area {
    const directions = arcOf(forward, cosHalf)
    const middle = directions.findIndex(point => point.equals(forward))
    const outer = directions.map(point => center.plus(point.times(radius)))
    const back = directions.map(point => center.plus(point.times(inner))).reverse()
    return [...outer.slice(middle), ...back, ...outer.slice(0, middle)]
}

/**
 * The directions along the arc of a slice of a disc, a meter long: from the edge turned counterclockwise to
 * the other, through the direction of the slice.
 */
function arcOf(forward: Vector2, cosHalf: number): Vector2[] {
    const sinHalf = Math.sqrt(1 - cosHalf * cosHalf)
    const arc = [forward.rotated(cosHalf, -sinHalf)]
    // The thirty-seconds strictly inside the slice, from the edge turned counterclockwise to the other.
    const inside = THIRTY_SECONDS
        .map(([cos, sin]) => ({ cos, sin }))
        .filter(({ cos }) => cos > cosHalf)
        .sort((first, second) => first.sin - second.sin)
    for(const { cos, sin } of inside) arc.push(forward.rotated(cos, sin))
    arc.push(forward.rotated(cosHalf, sinHalf))
    return arc
}

/** An area scaled around the origin, then moved to a point. */
function scaled(area: Area, center: Vector2, width: number, height: number): Area {
    return area.map(point => new Vector2(center.x + point.x * width, center.y + point.y * height))
}


// ------------------------------------------------------------------------------------------- Transforming

/**
 * An area, given as if it stood at the origin facing the top of the arena, placed at a point facing a
 * direction: its top toward `forward`, its right toward `right`, a quarter clockwise of `forward` by default.
 * Neither stays in the result, which is only a zone.
 */
export function move(
    area: Area, center: Vector2, forward: Vector2 = Vector2.UP, right: Vector2 = forward.right,
): Area {
    return area.map(point => center.plus(right.times(point.x)).plus(forward.times(-point.y)))
}


// ------------------------------------------------------------------------------------------------ Testing

/** Does an area hold a point? */
export function checkPoint(area: Area, point: Vector2): boolean {
    let inside = false
    for(let i = 0, j = area.length - 1; i < area.length; j = i++){
        const a = area[i]
        const b = area[j]
        const crossesRow = (a.y > point.y) !== (b.y > point.y)
        if(crossesRow && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
    return inside
}

/**
 * Does a disc of a radius around a point touch an area? The disc counts whole, so a body touching the area
 * drawn is touched, on every side.
 */
export function checkCircle(area: Area, center: Vector2, radius: number): boolean {
    if(checkPoint(area, center)) return true
    return edgesOf(area).some(([from, to]) => distanceToSegment(center, from, to) <= radius)
}

/** Does a line, from a point to another and as wide as a width, touch an area? */
export function checkLine(area: Area, from: Vector2, to: Vector2, width: number = 0): boolean {
    if(checkPoint(area, from)) return true
    return edgesOf(area).some(([start, end]) => segmentsDistance(from, to, start, end) <= width / 2)
}

/** Do two areas overlap? */
export function check(area: Area, other: Area): boolean {
    if(area.length === 0 || other.length === 0) return false
    if(checkPoint(area, other[0]) || checkPoint(other, area[0])) return true
    const others = edgesOf(other)
    return edgesOf(area).some(([from, to]) => {
        return others.some(([start, end]) => segmentsDistance(from, to, start, end) === 0)
    })
}

/** The sides of an area, each from a point to the next, the last back to the first. */
function edgesOf(area: Area): [Vector2, Vector2][] {
    return area.map((point, index) => [point, area[(index + 1) % area.length]])
}

/** How far a point lies from the closest point of a segment. */
export function distanceToSegment(point: Vector2, from: Vector2, to: Vector2): number {
    const along = to.minus(from)
    const squared = along.dot(along)
    if(squared === 0) return point.distance(from)
    const t = Math.min(1, Math.max(0, point.minus(from).dot(along) / squared))
    return point.distance(from.plus(along.times(t)))
}

/** How far two segments lie from each other: none when they cross. */
function segmentsDistance(from: Vector2, to: Vector2, start: Vector2, end: Vector2): number {
    const apart = cross(from, to, start) * cross(from, to, end) < 0
    const crossing = cross(start, end, from) * cross(start, end, to) < 0
    if(apart && crossing) return 0
    return Math.min(
        distanceToSegment(from, start, end), distanceToSegment(to, start, end),
        distanceToSegment(start, from, to), distanceToSegment(end, from, to),
    )
}

/** Which side of the line from a point to another a third one lies: positive, negative, or none on it. */
function cross(from: Vector2, to: Vector2, point: Vector2): number {
    const along = to.minus(from)
    const across = point.minus(from)
    return along.x * across.y - along.y * across.x
}
