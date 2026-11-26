import { TriggerKey } from "../../ObserverMap"
import type { Pose } from "../../Action"
import type { MoveEvent } from "../../events"
import type { Unit } from "../../Unit"

/** A unit leaving a pose for another at once, over whatever lies between. */
export interface JumpSignal {
    readonly unit: Unit
    readonly from: Pose
    readonly to: Pose
}

/** A unit going from a pose to another little by little: a walk, a turn on the spot, a shove. */
export interface GlideSignal extends JumpSignal {
    /** How long it took, in seconds of the simulation. */
    readonly duration: number
}

/** A unit changed place, however it did: told on its battle, and on itself. */
export const RELOCATED = new TriggerKey<MoveEvent>("relocated")
