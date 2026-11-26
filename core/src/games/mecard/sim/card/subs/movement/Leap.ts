import type { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH } from "../../../battle/previewColors"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Action, Pose } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, wait } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { LEAPING } from "../../../battle/mecanic/leap/keyword"
import { LEAP_TIME } from "../../../battle/mecanic/leap/shown"
import * as Leap from "../../../battle/mecanic/leap"
import * as Previews from "../../../battle/preview/Previews"

/** How far the jump of the catalog goes, in meters, before the agility of the unit. */
const LEAP_LENGTH = 3

/** A jump ahead, over everything: landing where there is no room, it is thrown aside to the nearest free spot. */
export class LeapCard extends ActionCard {


    constructor(
        /** How far it goes, in meters, before the agility of the unit. */
        public readonly length: number,
    ){
        super("Saut", [
            LEAPING.as("Saute"), " de ", length, "×", AGILITE, " ", DISTANCE, " devant, par-dessus tout. Mal retombé, tu es ",
            "éjecté à la place libre la plus proche.",
        ], Rarity.COMMON, LeapCard.#leaping(length))
    }


    static #leaping(length: number): Action {
        const target = (unit: Unit, pose: Pose): Vector2 => {
            return pose.position.plus(pose.direction.times(length * unit.stats.move.value))
        }
        return {
            use: function ({ battle, unit }){
                const to = target(unit, unit)
                hold(battle, LEAP_TIME, [Previews.arrow([unit.position, to], MOVE_WIDTH / 2, MOVE_COLOR)])
                if(Leap.leap(battle, unit, to)) Leap.unblock(battle, unit)
                wait(battle, LEAP_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const to = target(unit, pose)
                const landing = { ...pose, position: Leap.spot(battle, unit, to) }
                return Previews.still(landing, ...Leap.leapShown(battle, unit, pose.position, to))
            },
        }
    }
}

export const LEAP = new LeapCard(LEAP_LENGTH)
