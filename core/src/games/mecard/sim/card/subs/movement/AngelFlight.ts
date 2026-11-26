import type { Vector2 } from "../../../base/Vector2"
import { DISTANCE } from "../../../base/keywords"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, wait, WORD_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"
import { TELEPORT } from "../../../battle/mecanic/teleport/keyword"
import { TURN } from "../../../battle/mecanic/turn/keyword"
import * as Teleport from "../../../battle/mecanic/teleport"
import * as Turn from "../../../battle/mecanic/turn"

/** How far around the unit the angel looks for an ally, in meters. */
const FLIGHT_RADIUS = 6 - UNIT_RADIUS

/** How far in front of its ally the unit lands, from center to center, in meters: just off its face. */
const FRONT_GAP = 0.05

/** How long the flight takes to fade out and back in, in seconds. */
const FLIGHT_TIME = 0.15

/** What the flight says when no ally is around. */
const NOBODY = "aucun allié"

/** The ally farthest from a unit at a pose within the circle of the flight, from its edge, none when there is no ally in it. */
function farthestAlly(battle: Battle, unit: Unit, pose: Pose): Unit|null {
    let found: Unit|null = null
    let best = -Infinity
    for(const other of battle.bodies){
        if(other === unit || other.team !== unit.team) continue
        if(unit.hitbox.gap(pose, other.hitbox, other) > FLIGHT_RADIUS) continue
        const distance = other.position.distance(pose.position)
        if(distance <= best) continue
        found = other
        best = distance
    }
    return found
}

/** Where a unit lands before an ally: in front of it, facing the way it faces. */
function frontOf(unit: Unit, ally: Unit): { at: Vector2, facing: Vector2 } {
    const at = ally.position.plus(ally.direction.times(unit.radius + ally.radius + FRONT_GAP))
    return { at, facing: ally.direction }
}

function flying(): Action {
    const spot = (battle: Battle, unit: Unit, pose: Pose) => {
        const ally = farthestAlly(battle, unit, pose)
        return ally && frontOf(unit, ally)
    }
    return {
        use: function ({ battle, unit }){
            const found = spot(battle, unit, unit)
            if(!found){
                battle.events.push({ type: "skipped", unit, reason: NOBODY })
                hold(battle, WORD_TIME, [Previews.label(unit.position, NOBODY, NOTE_COLOR)])
                return
            }
            hold(battle, FLIGHT_TIME, [Previews.arrow([unit.position, found.at], MOVE_WIDTH / 2, MOVE_COLOR)])
            if(Teleport.teleport(battle, unit, found.at)) Turn.turn(battle, unit, found.facing)
            wait(battle, FLIGHT_TIME)
        },
        preview: ({ battle, unit, pose }) => {
            const found = spot(battle, unit, pose)
            if(!found) return Previews.still(pose, Previews.label(pose.position, NOBODY, NOTE_COLOR))
            return Teleport.teleportShown(battle, unit, pose, found.at, found.facing)
        },
    }
}

/** A jump before the farthest ally of a wide circle, facing its way. */
export const ANGEL_FLIGHT = new ActionCard("Envol de l'ange", [
    TELEPORT.as("Se téléporte"), " devant l'allié le plus loin dans un rayon de ", FLIGHT_RADIUS, " ", DISTANCE, ", ",
    TURN.as("tourné"), " comme lui. Aucun allié : raté.",
], Rarity.RARE, flying())
