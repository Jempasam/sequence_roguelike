import { Color } from "../../../../engine/math"
import type { Rgba } from "../../sim/base/Rgba"
import type { Unit } from "../../sim/battle/Unit"
import type { HeartKind } from "../../sim/heart/HeartKind"

/** The edge around what is being looked at: a heart, a process. */
export const LIT_EDGE = new Color(1, 0.95, 0.6)

/** The engine color of a color of the sim. */
export function engineColor({ r, g, b, a }: Rgba): Color {
    return new Color(r, g, b, a)
}

/** The color a unit is drawn in, the same on the board and in the interface: the one its battle gave it. */
export function colorOf(unit: Unit): Color {
    return engineColor(unit.color)
}

/** The color a heart of a kind is drawn in. */
export function heartColorOf(kind: HeartKind): Color {
    return engineColor(kind.color)
}
