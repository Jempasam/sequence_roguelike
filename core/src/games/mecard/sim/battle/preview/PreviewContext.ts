import type { Pose } from "../Action"
import type { Battle } from "../Battle"
import type { Unit } from "../Unit"

/**
 * What something is previewed from: the battle as it stands, the unit, and where it would be by then. For a
 * thing a unit carries, a status, a process, a usable or an item, the unit is its carrier and the pose where
 * it stands now.
 */
export interface PreviewContext {
    /** The battle, only read: the other units are where they stand now. */
    readonly battle: Battle

    readonly unit: Unit

    /** Where the unit would stand and face before it, after the ones planned before. */
    readonly pose: Pose
}
