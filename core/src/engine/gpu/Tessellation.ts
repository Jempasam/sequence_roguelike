/** A point of the plane, which a `Vec3` or a literal both are. */
export interface Point {
    readonly x: number
    readonly y: number
}

/**
 * How long a side of the polygon drawing a curve is at most, in world units: a circle of radius 8 gets 26
 * sides.
 */
const CURVE_SEGMENT_LENGTH = 2

/** The fewest sides a full circle is drawn with, so a tiny one still looks round rather than square. */
const MIN_CIRCLE_SEGMENTS = 8

/** The most sides a full circle is drawn with, however large it is. */
const MAX_CIRCLE_SEGMENTS = 256

/**
 * How far a miter join reaches at most, as a ratio of the miter length to the thickness of the line, as
 * the miter limit of SVG and Canvas. Beyond it, the corner is beveled, or an acute angle would shoot a
 * long spike. 4 bevels the corners sharper than about 29°.
 */
export const MITER_LIMIT = 4

/**
 * The triangles of a shape, in the local coordinates it was described in. Reused from one shape to the
 * next, so cutting a shape every frame allocates nothing once the arrays have grown.
 */
export class Shape {


    /** The points, as `x, y` pairs. */
    public readonly positions: number[] = []

    /** The triangles, three indices of points each. */
    public readonly indices: number[] = []


    /** How many points the shape has. */
    public get pointCount(): number {
        return this.positions.length / 2
    }

    /** Empty the shape, to describe another one. */
    public clear(): void {
        this.positions.length = 0
        this.indices.length = 0
    }

    /** Add a point, and get its index. */
    public point(x: number, y: number): number {
        this.positions.push(x, y)
        return this.positions.length / 2 - 1
    }

    /** Add a triangle, by the indices of its points. */
    public triangle(a: number, b: number, c: number): void {
        this.indices.push(a, b, c)
    }
}

/**
 * How many sides an arc is drawn with.
 *
 * @param radius - The radius once drawn, in pixels of the target, so a scaled-up circle stays smooth.
 * @param sweep - The angle of the arc, in radians.
 */
export function curveSegmentsOf(radius: number, sweep: number): number {
    const turn = Math.abs(sweep) / (2 * Math.PI)
    const segments = Math.ceil(Math.abs(sweep) * radius / CURVE_SEGMENT_LENGTH)
    const fewest = Math.max(1, Math.ceil(MIN_CIRCLE_SEGMENTS * turn))
    return Math.min(Math.max(segments, fewest), Math.max(1, Math.ceil(MAX_CIRCLE_SEGMENTS * turn)))
}

/** Describe a rectangle, from its top left corner. */
export function rectShape(shape: Shape, x: number, y: number, width: number, height: number): void {
    shape.clear()
    shape.point(x, y)
    shape.point(x + width, y)
    shape.point(x + width, y + height)
    shape.point(x, y + height)
    shape.triangle(0, 1, 2)
    shape.triangle(0, 2, 3)
}

/** Describe a triangle, by its three corners. */
export function triangleShape(
    shape: Shape, ax: number, ay: number, bx: number, by: number, cx: number, cy: number,
): void {
    shape.clear()
    shape.point(ax, ay)
    shape.point(bx, by)
    shape.point(cx, cy)
    shape.triangle(0, 1, 2)
}

/**
 * Describe a filled arc, the slice of a disk between two angles, or the whole disk when they are a full
 * turn apart.
 *
 * @param start - The angle the slice starts at, in radians, clockwise from the `x` axis since `y` is down.
 * @param segments - How many sides the curved edge has, from {@link curveSegmentsOf}.
 */
export function arcShape(
    shape: Shape, cx: number, cy: number, radius: number, start: number, end: number, segments: number,
): void {
    shape.clear()
    const isFull = Math.abs(end - start) >= 2 * Math.PI
    const center = shape.point(cx, cy)
    const rimPoints = isFull ? segments : segments + 1
    for(let i = 0; i < rimPoints; i++){
        const angle = start + (end - start) * i / segments
        shape.point(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
    }
    for(let i = 0; i < segments; i++) shape.triangle(center, 1 + i, 1 + (i + 1) % rimPoints)
}

/** Describe a thick segment: a quad along it, with square ends cut flush at its two points. */
export function thickLineShape(shape: Shape, a: Point, b: Point, thickness: number): void {
    shape.clear()
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    if(length === 0) return
    const nx = -(b.y - a.y) / length * thickness / 2
    const ny = (b.x - a.x) / length * thickness / 2
    shape.point(a.x + nx, a.y + ny)
    shape.point(b.x + nx, b.y + ny)
    shape.point(b.x - nx, b.y - ny)
    shape.point(a.x - nx, a.y - ny)
    shape.triangle(0, 1, 2)
    shape.triangle(0, 2, 3)
}

/**
 * Describe the inside of a polygon of one contour, convex or not, cut into triangles by its ears. Repeated
 * points are skipped. A contour crossing itself is cut into triangles that overlap or leave gaps.
 *
 * @remarks
 * An ear is a corner turning the way the polygon turns, whose triangle holds no other corner: cutting it
 * off leaves a polygon of one corner less, so a polygon of `n` corners is `n - 2` ears. Looking for each
 * ear goes over every corner, so the cut is in `n³` at worst, which the few corners of an icon allow.
 */
export function polygonShape(shape: Shape, points: readonly Point[]): void {
    shape.clear()
    const corners = distinctPoints(points, true)
    if(corners.length < 3) return
    for(const corner of corners) shape.point(corner.x, corner.y)
    const turn = Math.sign(signedArea(corners))
    if(turn === 0) return
    const left = corners.map((_, index) => index)
    while(left.length > 3){
        const ear = left.findIndex((_, at) => isEar(corners, left, at, turn))
        // None, only for a contour crossing itself: the rest is cut as a fan rather than left out.
        if(ear < 0) break
        const n = left.length
        shape.triangle(left[(ear + n - 1) % n], left[ear], left[(ear + 1) % n])
        left.splice(ear, 1)
    }
    for(let i = 1; i + 1 < left.length; i++) shape.triangle(left[0], left[i], left[i + 1])
}

/** Twice the area of a polygon, positive when its corners turn clockwise on a plane whose `y` is down. */
function signedArea(corners: readonly Point[]): number {
    let area = 0
    for(let i = 0; i < corners.length; i++){
        const a = corners[i]
        const b = corners[(i + 1) % corners.length]
        area += a.x * b.y - b.x * a.y
    }
    return area
}

/** How a corner `b` turns between `a` and `c`: positive clockwise on a plane whose `y` is down. */
function turnOf(a: Point, b: Point, c: Point): number {
    return (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
}

/** Is a corner of what is left of a polygon an ear: turning its way, its triangle empty of other corners? */
function isEar(corners: readonly Point[], left: readonly number[], at: number, turn: number): boolean {
    const n = left.length
    const a = corners[left[(at + n - 1) % n]]
    const b = corners[left[at]]
    const c = corners[left[(at + 1) % n]]
    const corner = Math.sign(turnOf(a, b, c))
    // A flat corner is cut off for nothing: its triangle has no area.
    if(corner === 0) return true
    if(corner !== turn) return false
    return left.every(index => {
        const p = corners[index]
        if(p === a || p === b || p === c) return true
        // A point on an edge counts as inside, so an ear never cuts through a corner it touches.
        const isInside = turnOf(a, b, p) * turn >= 0 && turnOf(b, c, p) * turn >= 0
            && turnOf(c, a, p) * turn >= 0
        return !isInside
    })
}

/**
 * Describe a thick polyline, its corners joined with a miter, beveled beyond {@link MITER_LIMIT}, and its
 * ends cut flush. Repeated points are skipped. Fewer than two distinct points describe nothing.
 *
 * @param closed - Does the last point join back to the first?
 */
export function multiLineShape(
    shape: Shape, points: readonly Point[], thickness: number, closed: boolean,
): void {
    shape.clear()
    const corners = distinctPoints(points, closed)
    const n = corners.length
    if(n < 2) return
    for(let i = 0; i < n; i++) joinCorner(shape, corners, i, thickness / 2, closed)
    const segments = closed ? n : n - 1
    for(let i = 0; i < segments; i++){
        // Each corner has four points, the left and right ends of the segment coming in, then of the one
        // going out: a segment runs from the outgoing ends of one corner to the incoming ends of the next.
        const from = 4 * i
        const to = 4 * ((i + 1) % n)
        shape.triangle(from + 2, from + 3, to + 1)
        shape.triangle(from + 2, to + 1, to)
    }
}


//// Joins ////

/** The corners of the polyline being described, kept from one polyline to the next. */
const CORNERS: Point[] = []

/** The points of a polyline, without its repeated points, which have no direction to join. */
function distinctPoints(points: readonly Point[], closed: boolean): readonly Point[] {
    CORNERS.length = 0
    for(const point of points){
        const last = CORNERS[CORNERS.length - 1]
        if(!last || last.x !== point.x || last.y !== point.y) CORNERS.push(point)
    }
    const first = CORNERS[0]
    const last = CORNERS[CORNERS.length - 1]
    if(closed && CORNERS.length > 1 && first.x === last.x && first.y === last.y) CORNERS.pop()
    return CORNERS
}

/**
 * Add the four points of a corner, the left and right ends of the segment coming in then of the one going
 * out, and the bevel triangle when the corner is beveled. Where the miter holds, both pairs are the same
 * points. An end of an open polyline has no segment on one side, so it takes the normal of the other.
 */
function joinCorner(shape: Shape, corners: readonly Point[], i: number, half: number, closed: boolean): void {
    const n = corners.length
    const p = corners[i]
    const previous = i > 0 ? corners[i - 1] : closed ? corners[n - 1] : null
    const next = i < n - 1 ? corners[i + 1] : closed ? corners[0] : null
    const inX = previous ? p.x - previous.x : 0
    const inY = previous ? p.y - previous.y : 0
    const outX = next ? next.x - p.x : inX
    const outY = next ? next.y - p.y : inY
    const inLength = previous ? Math.hypot(inX, inY) : Math.hypot(outX, outY)
    const outLength = Math.hypot(outX, outY)
    // The left normals, of length 1. An end without a segment coming in borrows the one going out.
    const inNx = previous ? -inY / inLength : -outY / outLength
    const inNy = previous ? inX / inLength : outX / outLength
    const outNx = -outY / outLength
    const outNy = outX / outLength
    const miterX = inNx + outNx
    const miterY = inNy + outNy
    const miterLength = Math.hypot(miterX, miterY)
    const isTurnedBack = miterLength < 1e-9
    // The cosine of half the turn: 1 straight on, near 0 when the line almost turns back.
    const cosHalf = isTurnedBack ? 0 : (miterX * inNx + miterY * inNy) / miterLength
    if(!isTurnedBack && 1 / cosHalf <= MITER_LIMIT){
        const mx = miterX / miterLength * half / cosHalf
        const my = miterY / miterLength * half / cosHalf
        for(let k = 0; k < 2; k++){
            shape.point(p.x + mx, p.y + my)
            shape.point(p.x - mx, p.y - my)
        }
        return
    }
    const base = shape.pointCount
    shape.point(p.x + inNx * half, p.y + inNy * half)
    shape.point(p.x - inNx * half, p.y - inNy * half)
    shape.point(p.x + outNx * half, p.y + outNy * half)
    shape.point(p.x - outNx * half, p.y - outNy * half)
    if(isTurnedBack) return
    // A turn towards the left normal has its outer side on the right.
    const turnsLeft = inX * outY - inY * outX > 0
    // The inner ends stay where they are, inside the stroke: the bevel only fills the outer gap, from the
    // incoming end crossing the corner point to the outer outgoing end.
    if(turnsLeft) shape.triangle(base, base + 1, base + 3)
    else shape.triangle(base + 1, base, base + 2)
}
