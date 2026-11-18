import type { Vector2 } from "../../../base/Vector2"
import type { Action, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { HAZARD_COLOR, NOTE_COLOR, PHYSICAL_COLOR, RANGE_COLOR } from "../../../battle/previewColors"

import { SHORT_TIME, hold } from "./playing"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** A segment ahead of a unit at a pose, from the edge of its body. */
export function ahead(unit: Unit, pose: Pose, length: number, width: number): Area {
    const from = unit.muzzle(pose)
    return Areas.line(from, from.plus(pose.direction.times(length)), width)
}

/** The unit of some the nearest to a point, none for none. */
export function nearest(units: readonly Unit[], from: Vector2): Unit|null {
    let found: Unit|null = null
    let best = Infinity
    for(const unit of units){
        const distance = unit.position.distance(from)
        if(distance < best){
            found = unit
            best = distance
        }
    }
    return found
}

/** A ring around a unit, in a preview. */
export function ring(unit: Unit) {
    return Previews.polygon(unit.hitbox.outline(unit), HAZARD_COLOR)
}

/**
 * An action that does something to the first unit of a segment ahead: its preview shows the segment, then
 * the unit.
 */
export function onFirstAhead(
    length: number, width: number, effect: (battle: Battle, unit: Unit, target: Unit) => void, what: string,
): Action {
    return {
        use: function ({ battle, unit }){
            const area = ahead(unit, unit, length, width)
            const target = nearest(battle.fetch(area, unit), unit.position)
            if(target) effect(battle, unit, target)
            hold(battle, SHORT_TIME, [Previews.polygon(area, PHYSICAL_COLOR)])
        },
        preview: ({ battle, unit, pose }) => {
            const area = ahead(unit, pose, length, width)
            const target = nearest(battle.fetch(area, unit), pose.position)
            return Previews.still(pose, Previews.polygon(area, RANGE_COLOR), ...target ? [ring(target), Previews.label(target.position, what, NOTE_COLOR)] : [])
        },
    }
}

/** An action that does something to its own unit: its preview says what with a word over it. */
export function onSelf(effect: (battle: Battle, unit: Unit) => void, what: string): Action {
    return {
        use: function ({ battle, unit }){
            effect(battle, unit)
            hold(battle, SHORT_TIME, [Previews.label(unit.position, what, NOTE_COLOR)])
        },
        preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, what, NOTE_COLOR)),
    }
}

/**
 * An action that does something to every unit within a distance of the body of its unit, itself maybe included:
 * the distance counts from the edge of the body, all around.
 */
export function onCircle(
    radius: number, who: (unit: Unit, other: Unit) => boolean, effect: (battle: Battle, unit: Unit, other: Unit) => void,
    what: string,
): Action {
    const chosen = (battle: Battle, unit: Unit, pose: Pose) => {
        return battle.touchables.filter(other => {
            return who(unit, other) && unit.hitbox.gap(pose, other.hitbox, other) <= radius
        })
    }
    return {
        use: function ({ battle, unit }){
            for(const other of chosen(battle, unit, unit)) effect(battle, unit, other)
            hold(battle, SHORT_TIME, [Previews.polygon(unit.around(radius), RANGE_COLOR)])
        },
        preview: ({ battle, unit, pose }) => {
            return Previews.still(pose, Previews.polygon(unit.around(radius, pose), RANGE_COLOR), ...chosen(battle, unit, pose).flatMap(other => {
                return [ring(other), Previews.label(other.position, what, NOTE_COLOR)]
            }))
        },
    }
}
