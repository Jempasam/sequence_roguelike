import type { Vector2 } from "../../../base/Vector2"
import type { Battle } from "../../Battle"
import type { Unit } from "../../Unit"
import { canMove, jump, nearestFree } from "../relocation/relocate"

import { TELEPORTED } from "./signals"

/**
 * Where a unit teleporting to a point ends up, none when it cannot: the point when there is room there,
 * else the free spot nearest to it, within a single push, else nowhere. Changes nothing.
 */
export function spot(battle: Battle, unit: Unit, to: Vector2): Vector2|null {
    if(battle.free(to, unit)) return to
    return nearestFree(battle, unit, to, 2 * unit.radius)
}

/**
 * Move a unit straight to a point, over whatever lies between, to the spot {@link spot} gives. The only
 * move that can fail: with no spot the unit stays where it is.
 *
 * @returns Did it go?
 */
export function teleport(battle: Battle, unit: Unit, to: Vector2): boolean {
    if(!canMove(battle, unit)) return false
    const landing = spot(battle, unit, to)
    if(!landing){
        battle.events.push({ type: "blocked", unit })
        return false
    }
    jump(battle, unit, landing, TELEPORTED)
    return true
}
