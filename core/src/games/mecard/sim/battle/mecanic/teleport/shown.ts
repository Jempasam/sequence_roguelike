import type { Vector2 } from "../../../base/Vector2"
import type { Pose } from "../../Action"
import type { Battle } from "../../Battle"
import type { Preview } from "../../preview/Preview"
import * as Previews from "../../preview/Previews"
import { MOVE_WIDTH, NOTE_COLOR } from "../../previewColors"
import type { Unit } from "../../Unit"

import { spot } from "./teleport"

/**
 * The preview of a teleport from a pose to a point: its way and the unit where it would appear, or a word
 * when there is no room.
 *
 * @param facing - Where the unit faces once there.
 */
export function teleportShown(battle: Battle, unit: Unit, pose: Pose, to: Vector2, facing: Vector2): Preview {
    const landing = spot(battle, unit, to)
    if(!landing) return Previews.still(pose, Previews.label(to, "bloqué", NOTE_COLOR))
    return Previews.still(
        { position: landing, direction: facing },
        ...Previews.moving(unit, pose.position, to, landing, MOVE_WIDTH / 2),
    )
}
