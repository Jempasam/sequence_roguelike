import type { Battle } from "../../Battle"
import type { Unit } from "../../Unit"
import { canMove, jump } from "../relocation/relocate"

import { SWAPPED } from "./signals"

/**
 * Swap the places of two units, when the first can move.
 *
 * @returns Did they swap?
 */
export function swap(battle: Battle, unit: Unit, other: Unit): boolean {
    if(!canMove(battle, unit)) return false
    const from = unit.position
    jump(battle, unit, other.position, SWAPPED)
    jump(battle, other, from, SWAPPED)
    return true
}
