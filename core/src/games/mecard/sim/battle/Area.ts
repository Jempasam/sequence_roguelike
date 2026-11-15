import type { Vector2 } from "../base/Vector2"

/**
 * A zone of the arena an effect covers: what an attack hits, where a hazard lies. Only a polygon, the points
 * of its outline in turn around it: it has no center and no direction, whoever uses it knows those.
 *
 * Its first point sees it whole, so it fills as a fan from there, even when it is not convex: a crescent
 * starts from the middle of its outer arc.
 *
 * Build, move and test areas with `Areas`.
 */
export type Area = readonly Vector2[]
