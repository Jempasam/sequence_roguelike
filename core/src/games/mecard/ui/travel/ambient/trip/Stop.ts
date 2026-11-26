import type { Point } from "../../../../../../engine/math"
import type { Place } from "../../../../sim/run/Journey"

/** A point of a trip, where it starts or where it ends. */
export interface Stop {
    readonly position: Point

    /** The place of the map it lies at, none for a point out of the screen. */
    readonly place: Place|null
}
