import type { Vector2 } from "../../../base/Vector2"
import type { Pose } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"

import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** The cosine of half the angle of a narrow cone: a cone of 45°. */
export const NARROW_COS_HALF = Math.cos(Math.PI / 8)

/** How far a long cone reaches, in meters: twice as far as the cone of the hypnosis. */
export const LONG_CONE_RANGE = 8

/** The cone from a pose, as far as a range, as wide as the cosine of its half angle says. */
export function coneFrom({ position, direction }: Pose, range: number, cosHalf: number): Area {
    return Areas.arc(position, direction, range, cosHalf)
}

/** The unit closest to a point among others, the first of them when several are as close, none for none. */
export function closestOf(point: Vector2, units: readonly Unit[]): Unit|null {
    let closest: Unit|null = null
    for(const each of units){
        if(!closest || each.position.distance(point) < closest.position.distance(point)) closest = each
    }
    return closest
}

/** The closest unit in a cone from a pose, whoever it is, the caster apart, none for none. */
export function closestInCone(battle: Battle, unit: Unit, pose: Pose, range: number, cosHalf: number): Unit|null {
    return closestOf(pose.position, battle.fetch(coneFrom(pose, range, cosHalf), unit))
}

/** What aiming a cone shows: the cone, and the arrow to the unit it finds, or the word saying nobody is in it. */
export function aimedCone(
    pose: Pose, range: number, cosHalf: number, target: Unit|null, nobody: string,
): Indicator[] {
    const zone = Previews.polygon(coneFrom(pose, range, cosHalf), CONTROL_COLOR)
    if(!target) return [zone, Previews.label(pose.position, nobody, NOTE_COLOR)]
    const way = target.position.minus(pose.position).normalized
    if(!way) return [zone]
    const end = target.position.minus(way.times(target.radius))
    return [zone, Previews.arrow([pose.position, end], MOVE_WIDTH, CONTROL_COLOR)]
}
