import type { Pose } from "../../Action"
import type { Preview } from "../../preview/Preview"
import * as Previews from "../../preview/Previews"
import { CONTROL_COLOR, MOVE_COLOR, MOVE_WIDTH } from "../../previewColors"
import type { Unit } from "../../Unit"

/** The preview of a swap from a pose with another unit: the way of each, and the unit in its new place. */
export function swapShown(unit: Unit, pose: Pose, other: Unit): Preview {
    return Previews.still(
        { ...pose, position: other.position },
        Previews.arrow([pose.position, other.position], MOVE_WIDTH / 2, MOVE_COLOR),
        Previews.arrow([other.position, pose.position], MOVE_WIDTH / 2, CONTROL_COLOR),
        Previews.body(unit, other.position, pose.direction),
    )
}
