import { NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { TOUCH_RANGE, touchZone } from "./touch"
import { DISTANCE, UNIT } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"
import { VIOLENT_PUSH } from "../../../battle/mecanic/push/keyword"
import { PUSH_DAMAGE } from "../../../battle/mecanic/push/shove"
import * as Pushing from "../../../battle/mecanic/push"
import * as Previews from "../../../battle/preview/Previews"

/** How far the push of the catalog moves its target, in meters: a step. */
const PUSH_DISTANCE = 2

/** How fast a unit pushed by the push of the catalog goes, in meters per second. */
const PUSH_SPEED = 6

/** A violent push of the unit just ahead. */
export class PushCard extends ActionCard {


    constructor(
        /** How far it moves its target, in meters. */
        public readonly distance: number,

        /** How fast the pushed unit goes, in meters per second. */
        public readonly speed: number,
    ){
        super("Pousser", [
            VIOLENT_PUSH.as("Pousse violemment"), " de ", distance, " ", DISTANCE, " l'", UNIT, " juste devant, à ",
            TOUCH_RANGE, " ", DISTANCE, ". Choc : ", PUSH_DAMAGE, " ", DamageType.PHYSICAL, ".",
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
                Pushing.shoveViolently({
                    battle, by: unit, target, direction: unit.direction, distance, speed, damage: PUSH_DAMAGE,
                })
            },
            preview: ({ battle, unit, pose }) => {
                const { unit: target } = battle.ray(unit, TOUCH_RANGE, pose)
                const zone = touchZone(unit, pose)
                if(!target) return Previews.still(pose, zone, Previews.label(pose.position, "personne à pousser", NOTE_COLOR))
                const pushed = Pushing.violentShoveShown(battle, {
                    battle, by: unit, target, direction: pose.direction, distance, damage: PUSH_DAMAGE,
                })
                return Previews.still(pose, zone, ...pushed)
            },
        }
    }
}

export const PUSH = new PushCard(PUSH_DISTANCE, PUSH_SPEED)
