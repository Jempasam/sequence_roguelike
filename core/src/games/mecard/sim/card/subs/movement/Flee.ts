import type { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, travel, wait, WALK_SPEED, WORD_TIME } from "../tools/playing"
import { arrow, label, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { STEP_LENGTH } from "./Step"

/** How close an enemy must stand for the flight of the catalog to go, in meters. */
const FLEE_REACH = 2

/** How long the unit stays still after its flight, in seconds. */
const SETTLE_TIME = 0.08

/** What the flight says when nobody is close. */
const NOBODY = "personne de proche"

/** The way away from the closest enemy too close to a pose, none when nobody is. */
function awayFrom(battle: Battle, unit: Unit, pose: Pose, reach: number): Vector2|null {
    const enemy = battle.nearestEnemy(unit, reach, pose.position)
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
            use: function* (ctx){
                const { battle, unit } = ctx
                const way = awayFrom(battle, unit, unit, reach)
                if(!way){
                    battle.events.push({ type: "skipped", unit, reason: NOBODY })
                    yield* hold(battle, WORD_TIME, [label(unit.position, NOBODY, NOTE_COLOR)])
                    return
                }
                yield* travel(ctx, way, length * unit.stats.move.value, WALK_SPEED)
                yield* wait(SETTLE_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const shown = polygon({ kind: "circle", center: pose.position, radius: reach }, RANGE_COLOR)
                const way = awayFrom(battle, unit, pose, reach)
                if(!way) return still(pose, shown, label(pose.position, NOBODY, NOTE_COLOR))
                const gone = battle.travel(unit, pose.position, way, length * unit.stats.move.value)
                const fled = arrow([pose.position, gone.to], MOVE_WIDTH, MOVE_COLOR)
                return still({ ...pose, position: gone.to }, shown, fled)
            },
        }
    }
}

export const FLEE = new FleeCard(STEP_LENGTH / 2, FLEE_REACH)
