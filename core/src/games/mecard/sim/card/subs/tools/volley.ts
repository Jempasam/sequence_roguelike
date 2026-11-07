import type { Vector2 } from "../../../base/Vector2"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { PHYSICAL_COLOR } from "../../../battle/previewColors"

import { SHOT_DAMAGE, SHOT_RANGE } from "../attack/Shot"
import { BOLT_WIDTH, fly } from "./bolt"

/** Where a shot of the catalog goes from a pose: the line it covers, on to the first body it meets. */
export function shotLine(battle: Battle, unit: Unit, pose: Pose): { area: Area, end: Vector2, target: Unit|null } {
    const { end, unit: target } = battle.ray(unit, SHOT_RANGE * unit.stats.throwRange.value, pose)
    return { area: { kind: "segment", from: pose.position, to: end, width: BOLT_WIDTH }, end, target }
}

/** How many hearts a shot takes: the hearts of a shot of the catalog, the precision of the unit added. */
export function shotHearts(unit: Unit): number {
    return SHOT_DAMAGE + unit.stats.precision.value
}

/**
 * Fire one shot of the catalog straight ahead, flying then landing.
 *
 * @returns The units it hit.
 */
export function* fireShot(battle: Battle, unit: Unit): Generator<void, Unit[], void> {
    const { area, end } = shotLine(battle, unit, unit)
    yield* fly(battle, unit.position, end, PHYSICAL_COLOR)
    return battle.strike(unit, area, shotHearts(unit), "physical")
}
