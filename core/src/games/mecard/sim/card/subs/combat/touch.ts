import { UNIT_RADIUS } from "../../../battle/Unit"
import { RANGE_COLOR } from "../../../battle/previewColors"
import type { Pose } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the taser and the push reach, in meters: about a body ahead. */
export const TOUCH_RANGE = 1

/**
 * Where the center of a body must lie for the taser or the push to reach it, from a pose: a band one body
 * wide, from the unit to a body ahead of its reach. Shown in their previews, so what can be reached reads
 * before anybody is there.
 */
export function touchZone(pose: Pose): Indicator {
    const to = pose.position.plus(pose.direction.times(TOUCH_RANGE + UNIT_RADIUS))
    return Previews.polygon(Areas.line(pose.position, to, 2 * UNIT_RADIUS), RANGE_COLOR)
}
