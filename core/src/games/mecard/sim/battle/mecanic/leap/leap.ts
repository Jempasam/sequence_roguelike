import type { Vector2 } from "../../../base/Vector2"
import type { Battle } from "../../Battle"
import type { Unit } from "../../Unit"
import { canMove, jump, nearestFree } from "../relocation/relocate"

import { LEAPED } from "./signals"

/**
 * Where a unit leaping to a point ends up: the point when there is room there, else the free spot nearest
 * to it, looked for ever farther, a leap never failing. Changes nothing.
 */
export function spot(battle: Battle, unit: Unit, to: Vector2): Vector2 {
    if(battle.free(to, unit)) return to
    const farthest = battle.arena.width + battle.arena.height
    for(let reach = 2 * unit.radius; reach <= farthest; reach += unit.radius){
        const landing = nearestFree(battle, unit, to, reach)
        if(landing) return landing
    }
    return to
}

/**
 * Move a unit straight to a point, over whatever lies between, room there or not, even past a wall: a
 * jump that lands where it may, followed by {@link unblock}.
 *
 * @returns Did it go?
 */
export function leap(battle: Battle, unit: Unit, to: Vector2): boolean {
    if(!canMove(battle, unit)) return false
    jump(battle, unit, to, LEAPED)
    return true
}

/**
 * Get a unit out of where it has no room, after a move that went over everything, a leap: when its body
 * lies in a wall, a pillar or another body, it is moved again to the free spot nearest to it, one that
 * {@link spot} gives, within the walls.
 */
export function unblock(battle: Battle, unit: Unit): void {
    if(!unit.alive || battle.free(unit.position, unit)) return
    battle.events.push({ type: "blocked", unit })
    jump(battle, unit, spot(battle, unit, unit.position), LEAPED)
}
