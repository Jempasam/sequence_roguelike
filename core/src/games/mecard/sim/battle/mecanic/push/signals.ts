import type { Vector2 } from "../../../base/Vector2"
import { SignalKey, TriggerKey } from "../../ObserverMap"
import type { Unit } from "../../Unit"
import type { GlideSignal } from "../relocation/signals"
import type { BumpSignal } from "../walk/signals"

/** A unit about to be moved by another: the listeners may shorten it. */
export interface IncomingShove {
    readonly target: Unit

    /** Who moves it, none when nobody does. */
    readonly by: Unit|null

    readonly direction: Vector2

    /** How far it will be moved, in meters. */
    distance: number
}

/** A unit was shoved. */
export const SHOVED = new SignalKey<GlideSignal>("shoved")

/** A unit shoved violently ran into another: the two bodies in contact, before they take the damage. */
export const SHOCKED = new SignalKey<BumpSignal>("shocked")

/** Another unit is about to move a unit, told on that unit: what it hears may shorten the way. */
export const INCOMING_SHOVE = new TriggerKey<IncomingShove>("incoming shove")
