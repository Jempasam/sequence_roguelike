import type { DamageType } from "../battle/DamageType"
import type { Unit } from "../battle/Unit"

/** A wound on its way to a heart: how many hearts it has left to take, its nature, and who deals it. */
export interface HeartDamage {
    /** How many hearts it still takes. A heart may change it, to take more or less of the wound. */
    amount: number

    readonly nature: DamageType

    /** Who deals it, none for nobody. */
    readonly source: Unit|null
}
