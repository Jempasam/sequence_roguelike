import type { Vector2 } from "../../../base/Vector2"
import { DamageType } from "../../DamageType"
import type { Unit } from "../../Unit"

import { shove } from "./shove"
import { SHOCKED } from "./signals"
import type { Shove, Shoved } from "./shove"

/** What a violent push asks. */
export interface ViolentShove extends Shove {
    /** How many hearts each collision takes, of each of the units it brings together. */
    readonly damage: number
}

/**
 * The way a unit goes off when a body stopped at a point runs into it: against the normal of its shape there,
 * along the line between the middles for two discs, so a hit off center sends it aside, as a billiard ball.
 *
 * @param at - Where the body that runs into it stands.
 * @param direction - The way that body was going: kept when the two share their middle.
 */
export function knockedWay(struck: Unit, at: Vector2, direction: Vector2): Vector2 {
    return struck.hitbox.normal(struck, at)?.opposite ?? direction
}

/**
 * Shove a unit violently: stopped short, it takes the damage, and so does the unit that stopped it, which is
 * then shoved violently in turn, as far, the way {@link knockedWay} gives, and so on. A wall or a pillar ends
 * the chain, and so does a unit that died, cannot be moved, or was shoved already in it. The bodies the first
 * unit goes through are its own: the others go through nothing. The way the next one goes is read before the
 * damage, whose reactions may move anyone.
 *
 * @returns How the shove of the first unit went.
 */
export function shoveViolently(asked: ViolentShove): Shoved {
    const { target, by, damage } = asked
    const first = shove(asked)
    const shoved = new Set<Unit>([target])
    let current = target
    let direction = asked.direction
    let outcome = first
    while(outcome.stopped){
        const { struck } = outcome
        const way = struck && knockedWay(struck, current.position, direction)
        if(struck) asked.battle.observers.of(SHOCKED).notify({ unit: current, struck })
        current.hearts.damage(damage, DamageType.PHYSICAL, by)
        struck?.hearts.damage(damage, DamageType.PHYSICAL, by)
        if(!struck?.alive || !way || !struck.movable || shoved.has(struck)) break
        shoved.add(struck)
        current = struck
        direction = way
        outcome = shove({ ...asked, target: current, direction, through: [] })
    }
    return first
}
