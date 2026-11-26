import type { Vector2 } from "../../../base/Vector2"
import type { Indicator } from "../../preview/Preview"
import * as Previews from "../../preview/Previews"
import { MOVE_WIDTH, NOTE_COLOR } from "../../previewColors"
import type { Unit } from "../../Unit"

import { TRAVEL_SLACK } from "./walk"
import type { Trip } from "./walk"

/**
 * What a walk shows in a preview: where it would go with nothing in the way, where it goes, the body where it
 * ends up, and a word when it is stopped short.
 *
 * @param from - Where it leaves from.
 * @param distance - How far it asks to go along the direction, in meters.
 * @param trip - Where it would end.
 */
export function walkShown(unit: Unit, from: Vector2, direction: Vector2, distance: number, trip: Trip): Indicator[] {
    const potential = from.plus(direction.times(distance))
    const shown = Previews.moving(unit, from, potential, trip.to, MOVE_WIDTH)
    if(trip.distance < distance - TRAVEL_SLACK) shown.push(Previews.label(trip.to, "bloqué", NOTE_COLOR))
    return shown
}
