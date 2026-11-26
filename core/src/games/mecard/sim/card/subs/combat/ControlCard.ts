import type { Vector2 } from "../../../base/Vector2"
import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { DISTANCE, UNIT } from "../../../base/keywords"
import { TURN } from "../../../battle/mecanic/turn/keyword"
import { WALK } from "../../../battle/mecanic/walk/keyword"
import * as Turn from "../../../battle/mecanic/turn"
import * as Walk from "../../../battle/mecanic/walk"
import * as Previews from "../../../battle/preview/Previews"

/** How far the charm and the fear of the catalog reach, in meters. */
const CONTROL_RANGE = 3 - UNIT_RADIUS

/** How far the charm and the fear of the catalog walk their target, in meters: a step. */
const CONTROL_WALK = 2

/** A card turning the first unit ahead toward or away from the caster, and walking it that way. */
export class ControlCard extends ActionCard {


    constructor(
        /** Does the unit turn toward the caster, or its back to it? */
        public readonly toward: boolean,

        /** How far it reaches, in meters. */
        public readonly range: number,

        /** How far it walks its target, in meters. */
        public readonly walk: number,
    ){
        super(
            toward ? "Charmer" : "Effrayer",
            [
                "L'", UNIT, " en face, jusqu'à ", range, " ", DISTANCE, ", ",
                ...toward ? [TURN.as("se tourne"), " vers toi"] : [TURN.as("te tourne le dos")],
                " et ", WALK.as("avance"), " de ", walk, " ", DISTANCE, ".",
            ],
            Rarity.RARE, ControlCard.#controlling(toward, range, walk),
        )
    }


    static #controlling(toward: boolean, range: number, walk: number): Action {
        // Where the first unit ahead of a pose would turn and walk, toward or away from it, none when nobody.
        type Controlled = { target: Unit, facing: Vector2 }
        const controlled = (battle: Battle, unit: Unit, pose: Pose): Controlled|null => {
            const { unit: target } = battle.ray(unit, range, pose)
            const toCaster = target?.position.minus(pose.position).opposite.normalized
            if(!target || !toCaster) return null
            return { target, facing: toward ? toCaster : toCaster.opposite }
        }
        return {
            use: function ({ battle, unit }){
                const controlling = controlled(battle, unit, unit)
                if(!controlling){
                    battle.events.push({ type: "skipped", unit, reason: "personne en face" })
                    hold(battle, SHORT_TIME, [Previews.label(unit.position, "personne en face", NOTE_COLOR)])
                    return
                }
                const theirs = { battle, unit: controlling.target }
                Turn.turnToward(theirs, controlling.facing)
                Walk.travel(theirs, controlling.facing, walk)
            },
            preview: ({ battle, unit, pose }) => {
                const controlling = controlled(battle, unit, pose)
                if(!controlling) return Previews.still(pose, Previews.label(pose.position, "personne en face", NOTE_COLOR))
                const { target, facing } = controlling
                const walked = Walk.spot(battle, target, target.position, facing, walk)
                return Previews.still(pose, ...Previews.strike([], [target]), Previews.arrow([target.position, walked.to], MOVE_WIDTH, CONTROL_COLOR))
            },
        }
    }
}

export const CHARM = new ControlCard(true, CONTROL_RANGE, CONTROL_WALK)
export const FEAR = new ControlCard(false, CONTROL_RANGE, CONTROL_WALK)
