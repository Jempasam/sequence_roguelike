import { UNIT_RADIUS } from "../../../battle/Unit"
import { RANGE_COLOR } from "../../../battle/previewColors"
import type { Indicator, Pose } from "../../../battle/Action"

import { polygon } from "../tools/previews"

/** How far the taser and the push reach, in meters: about a body ahead. */
export const TOUCH_RANGE = 1

/**
 * Where the center of a body must lie for the taser or the push to reach it, from a pose: a band one body
 * wide, from the unit to a body ahead of its reach. Shown in their previews, so what can be reached reads
 * before anybody is there.
 */
export function touchZone(pose: Pose): Indicator {
    const to = pose.position.plus(pose.direction.times(TOUCH_RANGE + UNIT_RADIUS))
    return polygon({ kind: "segment", from: pose.position, to, width: 2 * UNIT_RADIUS }, RANGE_COLOR)
}
