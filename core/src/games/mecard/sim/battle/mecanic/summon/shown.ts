import type { Vector2 } from "../../../base/Vector2"
import * as Areas from "../../area/Areas"
import type { Battle } from "../../Battle"
import { SUMMON_PALETTE } from "../../palettes"
import type { Indicator } from "../../preview/Preview"
import * as Previews from "../../preview/Previews"
import { NOTE_COLOR } from "../../previewColors"
import { UNIT_RADIUS } from "../../Unit"
import type { Unit } from "../../Unit"

import { summonableSpots } from "./summon"

/** How a body brought in shows in a preview, where it would stand. */
export function summonShown(at: Vector2): Indicator {
    return Previews.polygon(Areas.circle(at, UNIT_RADIUS), { ...SUMMON_PALETTE[0], a: 0.45 })
}

/**
 * What an invocation shows in a preview: each spot with room lit, and what the card shows around it, or a word
 * on the first spot when none has room.
 *
 * @param around - What the card shows around a spot with room, nothing by default.
 */
export function summonShows(
    battle: Battle, unit: Unit, spots: readonly Vector2[], size = 1, around: (spot: Vector2) => readonly Indicator[] = () => [],
): Indicator[] {
    const room = summonableSpots(battle, unit, spots, size)
    if(room.length === 0) return [Previews.label(spots[0] ?? unit.position, "pas de place", NOTE_COLOR)]
    return room.flatMap(spot => [summonShown(spot), ...around(spot)])
}
