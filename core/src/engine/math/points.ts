/** A point of a plane. */
export interface Point {
    readonly x: number
    readonly y: number
}

/** A rectangle of a plane, by its corner and its size. */
export interface Area {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
}

/** A point between two others, at a progress from 0 to 1. */
export function lerp(from: Point, to: Point, progress: number): Point {
    return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress }
}

/** The points of a broken line from a point to another, each pushed aside at random. */
export function jagged(
    random: () => number, from: Point, to: Point, segments: number, jitter: number,
): Point[] {
    const points: Point[] = []
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

/**
 * A point on the border of an area, on a random side, or on the side nearest to a point.
 *
 * @param toward - Where the point leads to or comes from, none for any side.
 */
export function borderPoint(random: () => number, area: Area, toward?: Point): Point {
    const { x, y, width, height } = area
    let edge = Math.floor(random() * 4)
    if(toward){
        const gaps = [toward.x - x, x + width - toward.x, toward.y - y, y + height - toward.y]
        edge = gaps.indexOf(Math.min(...gaps))
    }
    const across = 0.15 + random() * 0.7
    if(edge === 0) return { x, y: y + height * across }
    if(edge === 1) return { x: x + width, y: y + height * across }
    if(edge === 2) return { x: x + width * across, y }
    return { x: x + width * across, y: y + height }
}

/** How far past the edge of a rectangle a point out of it lies. */
const OUTSIDE = 24

/**
 * A point just out of a rectangle from the origin, on a random edge, or on the edge nearest to a point.
 *
 * @param toward - Where the point leads to or comes from, none for any edge.
 */
export function outsidePoint(
    random: () => number, size: { readonly width: number, readonly height: number }, toward?: Point,
): Point {
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
