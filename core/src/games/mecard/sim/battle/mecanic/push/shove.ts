import type { Vector2 } from "../../../base/Vector2"
import type { Battle } from "../../Battle"
import type { Unit } from "../../Unit"
import { move, travel, TRAVEL_SLACK } from "../walk/walk"
import type { Gone } from "../walk/walk"

import { INCOMING_SHOVE, SHOVED } from "./signals"

/** How many hearts each collision of a violent push costs, unless the push says more. */
export const PUSH_DAMAGE = 1

/** How fast a unit shoved by a card goes, in meters per second. */
export const SHOVE_SPEED = 6

/** What a shove asks. */
export interface Shove {
    readonly battle: Battle

    /** The unit that shoves: the one that takes the blame of the damage. */
    readonly by: Unit

    readonly target: Unit

    readonly direction: Vector2

    /** How far, in meters. */
    readonly distance: number

    /** The bodies it goes through, none by default. */
    readonly through?: readonly Unit[]

    /** How fast it goes, in meters per second. */
    readonly speed?: number

    /**
     * Is it moved in one stride, rather than stride after stride: what the scenery and an item at the start of
     * a round do? No by default.
     */
    readonly atOnce?: boolean
}

/** How a shove went. */
export interface Shoved extends Gone {
    /** Was it stopped before the whole distance it was granted? */
    readonly stopped: boolean
}

/** How a shove that moves nobody goes. */
const UNMOVED: Shoved = { distance: 0, struck: null, stopped: false }

/**
 * Shove a unit along a direction, whatever its mobility, hurting nobody. What others cannot move, the
 * scenery, stays, and nothing befalls it. The unit may resist, the way shortened.
 */
export function shove(
    { battle, by, target, direction, distance: asked, through = [], speed = SHOVE_SPEED, atOnce = false }: Shove,
): Shoved {
    if(!target.movable) return UNMOVED
    const incoming = { target, by, direction, distance: asked }
    target.observers.of(INCOMING_SHOVE).notify(incoming)
    const { distance } = incoming
    if(distance <= 0) return UNMOVED
    const shoving = target.shoving
    target.shoving = true
    try {
        const gone = atOnce
            ? move(battle, target, direction, distance, true, through, SHOVED)
            : travel({ battle, unit: target }, direction, distance, speed, true, through, SHOVED)
        return { distance: gone.distance, struck: gone.struck, stopped: gone.distance < distance - TRAVEL_SLACK }
    } finally {
        target.shoving = shoving
    }
}
