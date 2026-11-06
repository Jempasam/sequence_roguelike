import { Vector2 } from "../../../base/Vector2"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"

/**
 * The way something going along a direction bounces off what stopped it at a point: a wall flips it across, a
 * pillar or a body mirrors it along the normal of its round side. None when nothing is there.
 *
 * @param clearance - How far from what it met its center stops: its radius, none for a line.
 * @param slack - How much farther than that it may have stopped, in meters.
 * @param struck - The body it met, none when none.
 */
export function reflected(
    battle: Battle, at: Vector2, direction: Vector2, clearance: number, slack: number, struck: Unit|null,
): Vector2|null {
    if(struck) return mirrored(direction, at.minus(struck.position).normalized)
    const { width, height } = battle.arena
    const reach = clearance + slack
    const flipX = at.x <= reach || at.x >= width - reach
    const flipY = at.y <= reach || at.y >= height - reach
    if(flipX || flipY){
        return new Vector2(flipX ? -direction.x : direction.x, flipY ? -direction.y : direction.y)
    }
    const pillar = battle.bodies.find(each => !each.touchable && at.distance(each.position) <= each.radius + reach)
    return pillar ? mirrored(direction, at.minus(pillar.position).normalized) : null
}

/** A direction mirrored along a normal, none without a normal. */
function mirrored(direction: Vector2, normal: Vector2|null): Vector2|null {
    return normal && direction.minus(normal.times(2 * direction.dot(normal))).normalized
}
