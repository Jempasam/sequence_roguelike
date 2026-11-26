import type { Vector2 } from "../../../base/Vector2"
import type { Pose } from "../../Action"
import type { Battle } from "../../Battle"
import type { Preview } from "../../preview/Preview"
import * as Previews from "../../preview/Previews"
import { MOVE_WIDTH } from "../../previewColors"
import type { Unit } from "../../Unit"

import { spot } from "./blink"

/** The preview of a blink from a pose to a point: its way, and the unit where it would land. */
export function blinkShown(battle: Battle, unit: Unit, pose: Pose, to: Vector2): Preview {
    const landing = spot(battle, unit, pose.position, to)
    return Previews.still(
        { ...pose, position: landing },
        ...Previews.moving(unit, pose.position, to, landing, MOVE_WIDTH / 2),
    )
}
