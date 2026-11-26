import type { Vector2 } from "../../../base/Vector2"
import type { Battle } from "../../Battle"
import type { Indicator } from "../../preview/Preview"
import * as Previews from "../../preview/Previews"
import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../previewColors"
import type { Unit } from "../../Unit"
import { spot, TRAVEL_SLACK } from "../walk/walk"

import type { Shove } from "./shove"
import { knockedWay } from "./violent"
import type { ViolentShove } from "./violent"

/** What a shove shows in a preview: the way the unit goes, up to where it is stopped. */
export function shoveShown(battle: Battle, { target, direction, distance, through = [] }: Shove): Indicator[] {
    if(!target.movable) return []
    const trip = spot(battle, target, target.position, direction, distance, through)
    return [Previews.arrow([target.position, trip.to], MOVE_WIDTH, CONTROL_COLOR)]
}

/**
 * What a violent push shows in a preview, nothing changed: the way of each unit of the chain, the damage where
 * each is stopped, and the units it would hurt.
 *
 * @remarks
 * The chain is played blank: each unit stands for a moment where it would stop, so the next ones meet it there,
 * then all are put back, whatever happens. Nothing is told, and nothing is hurt.
 */
export function violentShoveShown(battle: Battle, asked: ViolentShove): Indicator[] {
    const { distance, damage } = asked
    const shown: Indicator[] = []
    const hurt: Unit[] = []
    const stood = new Map<Unit, Vector2>()
    let current: Unit|null = asked.target
    let direction = asked.direction
    let through: readonly Unit[] = asked.through ?? []
    try {
        while(current?.movable && !stood.has(current)){
            const trip = spot(battle, current, current.position, direction, distance, through)
            shown.push(Previews.arrow([current.position, trip.to], MOVE_WIDTH, CONTROL_COLOR))
            stood.set(current, current.position)
            current.position = trip.to
            if(trip.distance >= distance - TRAVEL_SLACK) break
            shown.push(Previews.label(trip.to, `choc ${damage}`, NOTE_COLOR))
            hurt.push(current)
            if(trip.struck){
                hurt.push(trip.struck)
                direction = knockedWay(trip.struck, trip.to, direction)
            }
            current = trip.struck
            through = []
        }
    } finally {
        for(const [unit, position] of stood) unit.position = position
    }
    return [...shown, ...Previews.strike([], hurt)]
}
