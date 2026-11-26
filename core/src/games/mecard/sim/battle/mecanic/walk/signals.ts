import { SignalKey } from "../../ObserverMap"
import type { Unit } from "../../Unit"
import type { GlideSignal } from "../relocation/signals"

/** A unit stopped by another in its way. */
export interface BumpSignal {
    readonly unit: Unit
    readonly struck: Unit
}

/** A unit walked, on its own or drawn along. */
export const WALKED = new SignalKey<GlideSignal>("walked")

/** A unit ran into another on a move of its own. */
export const BUMPED = new SignalKey<BumpSignal>("bumped")

/** A unit ran into another on any move, its own or forced: the two bodies in contact. */
export const COLLIDED = new SignalKey<BumpSignal>("collided")
