import type { Vector2 } from "../../../base/Vector2"
import type { Action, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { HAZARD_COLOR, NOTE_COLOR, PHYSICAL_COLOR, RANGE_COLOR } from "../../../battle/previewColors"

import { SHORT_TIME, hold } from "./playing"
import { label, polygon, still } from "./previews"

/** A segment ahead of a pose, from its center. */
export function ahead(pose: Pose, length: number, width: number): Area {
    return { kind: "segment", from: pose.position, to: pose.position.plus(pose.direction.times(length)), width }
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
    return polygon({ kind: "circle", center: unit.position, radius: unit.radius }, HAZARD_COLOR)
}

/**
 * An action that does something to the first unit of a segment ahead: its preview shows the segment, then
 * the unit.
 */
export function onFirstAhead(
    length: number, width: number, effect: (battle: Battle, unit: Unit, target: Unit) => void, what: string,
): Action {
    return {
        use: function* ({ battle, unit }){
            const area = ahead(unit, length, width)
            const target = nearest(battle.unitsIn(area, unit), unit.position)
            if(target) effect(battle, unit, target)
            yield* hold(battle, SHORT_TIME, [polygon(area, PHYSICAL_COLOR)])
        },
        preview: ({ battle, unit, pose }) => {
            const area = ahead(pose, length, width)
            const target = nearest(battle.unitsIn(area, unit), pose.position)
            return still(pose, polygon(area, RANGE_COLOR), ...target ? [ring(target), label(target.position, what, NOTE_COLOR)] : [])
        },
    }
}

/** An action that does something to its own unit: its preview says what with a word over it. */
export function onSelf(effect: (battle: Battle, unit: Unit) => void, what: string): Action {
    return {
        use: function* ({ battle, unit }){
            effect(battle, unit)
            yield* hold(battle, SHORT_TIME, [label(unit.position, what, NOTE_COLOR)])
        },
        preview: ({ pose }) => still(pose, label(pose.position, what, NOTE_COLOR)),
    }
}

/** An action that does something to every unit of a circle around its unit, itself maybe included. */
export function onCircle(
    radius: number, who: (unit: Unit, other: Unit) => boolean, effect: (battle: Battle, unit: Unit, other: Unit) => void,
    what: string,
): Action {
    const around = (pose: Pose): Area => ({ kind: "circle", center: pose.position, radius })
    const chosen = (battle: Battle, unit: Unit, pose: Pose) => {
        return battle.touchables.filter(other => {
            return who(unit, other) && other.position.distance(pose.position) <= radius + other.radius
        })
    }
    return {
        use: function* ({ battle, unit }){
            for(const other of chosen(battle, unit, unit)) effect(battle, unit, other)
            yield* hold(battle, SHORT_TIME, [polygon(around(unit), RANGE_COLOR)])
        },
        preview: ({ battle, unit, pose }) => {
            return still(pose, polygon(around(pose), RANGE_COLOR), ...chosen(battle, unit, pose).flatMap(other => {
                return [ring(other), label(other.position, what, NOTE_COLOR)]
            }))
        },
    }
}
