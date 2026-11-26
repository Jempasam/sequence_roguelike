import type { Vector2 } from "../../../base/Vector2"
import type { Battle } from "../../Battle"
import type { Indicator } from "../../preview/Preview"
import * as Previews from "../../preview/Previews"
import { MOVE_WIDTH, NOTE_COLOR } from "../../previewColors"
import type { Unit } from "../../Unit"

import { spot } from "./leap"

/** How long a leap takes to leave and to land, in seconds. */
export const LEAP_TIME = 0.12

/** What a leap from a point to another shows: its way, and a word when it lands where it has no room. */
export function leapShown(battle: Battle, unit: Unit, from: Vector2, to: Vector2): Indicator[] {
    const way = Previews.moving(unit, from, to, spot(battle, unit, to), MOVE_WIDTH / 2)
    return battle.free(to, unit) ? way : [...way, Previews.label(to, "éjecté", NOTE_COLOR)]
}
