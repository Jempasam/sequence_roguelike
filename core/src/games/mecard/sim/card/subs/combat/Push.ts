import { PUSH_BLOCKED_DAMAGE } from "../../../battle/rules"
import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { shove } from "../tools/shoving"
import { Rarity } from "../../Rarity"
import { TOUCH_RANGE, touchZone } from "./touch"
import { DISTANCE, UNIT } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"
import * as Previews from "../../../battle/preview/Previews"

/** How far the push of the catalog moves its target, in meters: a step. */
const PUSH_DISTANCE = 2

/** How fast a unit pushed by the push of the catalog goes, in meters per second. */
const PUSH_SPEED = 6

/** A push of the unit just ahead, hurting it when something stops it. */
export class PushCard extends ActionCard {


    constructor(
        /** How far it moves its target, in meters. */
        public readonly distance: number,

        /** How fast the pushed unit goes, in meters per second. */
        public readonly speed: number,
    ){
        super("Pousser", [
            "Repousse de ", distance, " ", DISTANCE, " l'", UNIT, " juste devant, à ", TOUCH_RANGE, " ", DISTANCE,
            ". Arrêtée en route, elle prend ", PUSH_BLOCKED_DAMAGE, " ", DamageType.PHYSICAL, ".",
        ], Rarity.COMMON, PushCard.#pushing(distance, speed))
    }


    static #pushing(distance: number, speed: number): Action {
        return {
            use: function ({ battle, unit }){
                const { unit: target } = battle.ray(unit, TOUCH_RANGE)
                if(!target){
                    battle.events.push({ type: "skipped", unit, reason: "personne à pousser" })
                    hold(battle, SHORT_TIME, [Previews.label(unit.position, "personne à pousser", NOTE_COLOR)])
                    return
                }
                // Pushed into something before the whole distance, it takes the damage of a blocked push.
                shove({
                    battle, by: unit, target, direction: unit.direction, distance, speed, impact: PUSH_BLOCKED_DAMAGE,
                })
            },
            preview: ({ battle, unit, pose }) => {
                const { unit: target } = battle.ray(unit, TOUCH_RANGE, pose)
                const zone = touchZone(pose)
                if(!target) return Previews.still(pose, zone, Previews.label(pose.position, "personne à pousser", NOTE_COLOR))
                const pushed = battle.moveSpot(target, target.position, pose.direction, distance)
                return Previews.still(pose, zone, ...Previews.strike([], [target]), Previews.arrow([target.position, pushed.to], MOVE_WIDTH, CONTROL_COLOR))
            },
        }
    }
}

export const PUSH = new PushCard(PUSH_DISTANCE, PUSH_SPEED)
