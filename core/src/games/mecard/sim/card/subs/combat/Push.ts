import { PUSH_BLOCKED_DAMAGE } from "../../../battle/rules"
import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { damage, meters } from "../../../battle/words"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { shove } from "../tools/shoving"
import { Rarity } from "../../Rarity"
import { TOUCH_RANGE, touchZone } from "./touch"
import { UNIT } from "../../../base/keywords"

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
            "Repousse de ", meters(distance), " l'", UNIT, " juste devant, à ", meters(TOUCH_RANGE),
            ". Arrêtée en route, elle prend ", damage(PUSH_BLOCKED_DAMAGE, "physical"), ".",
        ], Rarity.COMMON, PushCard.#pushing(distance, speed))
    }


    static #pushing(distance: number, speed: number): Action {
        return {
            use: function* ({ battle, unit }){
                const { unit: target } = battle.ray(unit, TOUCH_RANGE)
                if(!target){
                    battle.events.push({ type: "skipped", unit, reason: "personne à pousser" })
                    yield* hold(battle, SHORT_TIME, [label(unit.position, "personne à pousser", NOTE_COLOR)])
                    return
                }
                // Pushed into something before the whole distance, it takes the damage of a blocked push.
                yield* shove({
                    battle, by: unit, target, direction: unit.direction, distance, speed, impact: PUSH_BLOCKED_DAMAGE,
                })
            },
            preview: ({ battle, unit, pose }) => {
                const { unit: target } = battle.ray(unit, TOUCH_RANGE, pose)
                const zone = touchZone(pose)
                if(!target) return still(pose, zone, label(pose.position, "personne à pousser", NOTE_COLOR))
                const pushed = battle.travel(target, target.position, pose.direction, distance)
                return still(pose, zone, arrow([target.position, pushed.to], MOVE_WIDTH, CONTROL_COLOR))
            },
        }
    }
}

export const PUSH = new PushCard(PUSH_DISTANCE, PUSH_SPEED)
