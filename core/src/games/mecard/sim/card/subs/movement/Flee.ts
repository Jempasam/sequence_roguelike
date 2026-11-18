import type { Vector2 } from "../../../base/Vector2"
import { MOVE_WIDTH, NOTE_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, travel, wait, WALK_SPEED, WORD_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { STEP_LENGTH } from "./Step"
import * as Previews from "../../../battle/preview/Previews"

/** How close an enemy must stand for the flight of the catalog to go, in meters. */
const FLEE_REACH = 2 - UNIT_RADIUS

/** How long the unit stays still after its flight, in seconds. */
const SETTLE_TIME = 0.08

/** What the flight says when nobody is close. */
const NOBODY = "personne de proche"

/** The way away from the closest enemy too close to the edge of a unit at a pose, none when nobody is. */
function awayFrom(battle: Battle, unit: Unit, pose: Pose, reach: number): Vector2|null {
    let enemy: Unit|null = null
    for(const each of battle.enemiesOf(unit)){
        if(unit.hitbox.gap(pose, each.hitbox, each) > reach) continue
        if(!enemy || each.position.distance(pose.position) < enemy.position.distance(pose.position)) enemy = each
    }
    if(!enemy) return null
    return pose.position.minus(enemy.position).normalized ?? pose.direction.opposite
}

/** A step away from the closest enemy when it stands too close, without turning. */
export class FleeCard extends ActionCard {


    constructor(
        /** How far it goes, in meters, before the agility of the unit. */
        public readonly length: number,

        /** How close an enemy must stand for it to go, in meters. */
        public readonly reach: number,
    ){
        super("Fuite", [
            "Si un ennemi est à moins de ", reach, " ", DISTANCE, ", s'éloigne de ", length, "×", AGILITE, " ",
            DISTANCE, " à l'opposé du plus proche, sans se retourner.",
        ], Rarity.COMMON, FleeCard.#fleeing(length, reach))
    }


    static #fleeing(length: number, reach: number): Action {
        return {
            use: function (ctx){
                const { battle, unit } = ctx
                const way = awayFrom(battle, unit, unit, reach)
                if(!way){
                    battle.events.push({ type: "skipped", unit, reason: NOBODY })
                    hold(battle, WORD_TIME, [Previews.label(unit.position, NOBODY, NOTE_COLOR)])
                    return
                }
                travel(ctx, way, length * unit.stats.move.value, WALK_SPEED)
                wait(battle, SETTLE_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const shown = Previews.polygon(unit.around(reach, pose), RANGE_COLOR)
                const way = awayFrom(battle, unit, pose, reach)
                if(!way) return Previews.still(pose, shown, Previews.label(pose.position, NOBODY, NOTE_COLOR))
                const gone = battle.moveSpot(unit, pose.position, way, length * unit.stats.move.value)
                const full = pose.position.plus(way.times(length * unit.stats.move.value))
                return Previews.still({ ...pose, position: gone.to }, shown, ...Previews.moving(unit, pose.position, full, gone.to, MOVE_WIDTH))
            },
        }
    }
}

export const FLEE = new FleeCard(STEP_LENGTH / 2, FLEE_REACH)
