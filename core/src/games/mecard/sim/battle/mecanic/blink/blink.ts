import type { Vector2 } from "../../../base/Vector2"
import type { Battle } from "../../Battle"
import { BLINK_OVERSHOOT } from "../../rules"
import type { Unit } from "../../Unit"
import { canMove, jump } from "../relocation/relocate"

import { BLINKED } from "./signals"

/**
 * Where a unit blinking from a point to another lands, a blink never failing: on the point when there is
 * room there, else a little beyond it, else the farthest free point back toward where it blinks from,
 * which is free at the worst. Changes nothing: a blink and its preview both ask it.
 */
export function spot(battle: Battle, unit: Unit, from: Vector2, to: Vector2): Vector2 {
    if(battle.free(to, unit)) return to
    const way = to.minus(from).normalized
    if(!way) return from
    const step = unit.radius / 2
    for(let beyond = step; beyond <= BLINK_OVERSHOOT; beyond += step){
        const landing = to.plus(way.times(beyond))
        if(battle.free(landing, unit)) return landing
    }
    for(let back = step; back < from.distance(to); back += step){
        const landing = to.minus(way.times(back))
        if(battle.free(landing, unit)) return landing
    }
    return from
}

/** Move a unit straight to a point, over whatever lies between, to the spot {@link spot} gives. */
export function blink(battle: Battle, unit: Unit, to: Vector2): void {
    if(!canMove(battle, unit)) return
    jump(battle, unit, spot(battle, unit, unit.position, to), BLINKED)
}
