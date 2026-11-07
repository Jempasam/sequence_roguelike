import type { Vector2 } from "../../../base/Vector2"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { CONTROL_COLOR, MOVE_WIDTH, TURN_LENGTH } from "../../../battle/previewColors"
import type { Indicator } from "../../../battle/Action"

import { arrow } from "./previews"

/** A unit and the direction a turn gives it. */
export interface Turning {
    readonly unit: Unit
    readonly direction: Vector2
}

/**
 * What turning every unit in an area would do, each toward a direction of its own: none for a unit whose
 * direction is unknown, which stays as it is. The unit that turns them is never one of them.
 */
export function turnsIn(
    battle: Battle, area: Area, by: Unit, directionOf: (unit: Unit) => Vector2|null,
): Turning[] {
    const turnings: Turning[] = []
    for(const unit of battle.unitsIn(area, by)){
        const direction = directionOf(unit)
        if(direction) turnings.push({ unit, direction })
    }
    return turnings
}

/** Turn every unit in an area toward a direction of its own, the units it turned returned. */
export function turnUnitsIn(
    battle: Battle, area: Area, by: Unit, directionOf: (unit: Unit) => Vector2|null,
): Unit[] {
    const turnings = turnsIn(battle, area, by, directionOf)
    for(const { unit, direction } of turnings) battle.turn(unit, direction)
    return turnings.map(({ unit }) => unit)
}

/** An arrow from a unit toward the direction a turn gives it. */
export function turning({ unit, direction }: Turning): Indicator {
    return arrow([unit.position, unit.position.plus(direction.times(TURN_LENGTH))], MOVE_WIDTH, CONTROL_COLOR)
}
