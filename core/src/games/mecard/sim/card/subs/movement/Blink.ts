import type { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH } from "../../../battle/previewColors"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Action, Pose } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, wait } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"
import { BLINKING } from "../../../battle/mecanic/blink/keyword"
import * as Blink from "../../../battle/mecanic/blink"

/** How far the blink of the catalog jumps, in meters, before the move factor of the unit: a dash. */
const BLINK_LENGTH = 3

/** How long a blink takes to fade out and back in, in seconds. */
const BLINK_TIME = 0.15

/** A jump ahead, over everything. */
export class BlinkCard extends ActionCard {


    constructor(
        /** How far it jumps, in meters, before the move factor of the unit. */
        public readonly length: number,
    ){
        super("Blink", [BLINKING.as("Cligne"), " de ", length, "×", AGILITE, " ", DISTANCE, " devant, par-dessus tout."], Rarity.RARE, BlinkCard.#blink(length))
    }


    static #blink(length: number): Action {
        const target = (unit: Unit, pose: Pose): Vector2 => {
            return pose.position.plus(pose.direction.times(length * unit.stats.move.value))
        }
        return {
            use: function ({ battle, unit }){
                const to = target(unit, unit)
                hold(battle, BLINK_TIME, [Previews.arrow([unit.position, to], MOVE_WIDTH / 2, MOVE_COLOR)])
                Blink.blink(battle, unit, to)
                wait(battle, BLINK_TIME)
            },
            preview: ({ battle, unit, pose }) => Blink.blinkShown(battle, unit, pose, target(unit, pose)),
        }
    }
}

export const BLINK = new BlinkCard(BLINK_LENGTH)
