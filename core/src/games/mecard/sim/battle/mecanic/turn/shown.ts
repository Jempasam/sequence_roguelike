import type { Indicator } from "../../preview/Preview"
import * as Previews from "../../preview/Previews"
import { CONTROL_COLOR, MOVE_WIDTH, TURN_LENGTH } from "../../previewColors"

import type { Turning } from "./turn"

/** An arrow from a unit toward the direction a turn gives it. */
export function turningShown({ unit, direction }: Turning): Indicator {
    return Previews.arrow([unit.position, unit.position.plus(direction.times(TURN_LENGTH))], MOVE_WIDTH, CONTROL_COLOR)
}
