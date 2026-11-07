import type { Vector2 } from "../../../base/Vector2"
import type { Area } from "../../../battle/Area"

/** A segment of a length and a width centered on a point, along a direction. */
export function centeredSegment(center: Vector2, direction: Vector2, length: number, width: number): Area {
    const half = direction.times(length / 2)
    return { kind: "segment", from: center.minus(half), to: center.plus(half), width }
}

/**
 * A cross: two segments of a length and a width crossing at their centers, one along a direction, the other
 * across it. Struck with {@link Battle.strikeMany}, a unit at the crossing is hit once: it is one zone.
 */
export function cross(center: Vector2, direction: Vector2, length: number, width: number): Area[] {
    return [centeredSegment(center, direction, length, width), centeredSegment(center, direction.right, length, width)]
}
