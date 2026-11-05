import type { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { meters } from "../../../battle/words"
import type { Action, Pose } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, wait } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

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
        super("Blink", ["Se téléporte ", meters(length), " devant, par-dessus tout."], Rarity.RARE, BlinkCard.#blink(length))
    }


    static #blink(length: number): Action {
        const target = (unit: Unit, pose: Pose): Vector2 => {
            return pose.position.plus(pose.direction.times(length * unit.stats.move.value))
        }
        return {
            use: function* ({ battle, unit }){
                const to = target(unit, unit)
                yield* hold(battle, BLINK_TIME, [arrow([unit.position, to], MOVE_WIDTH / 2, MOVE_COLOR)])
                battle.blink(unit, to)
                yield* wait(BLINK_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const to = target(unit, pose)
                if(!battle.free(to, unit)) return still(pose, label(to, "bloqué", NOTE_COLOR))
                const jump = arrow([pose.position, to], MOVE_WIDTH / 2, MOVE_COLOR)
                return still({ ...pose, position: to }, jump)
            },
        }
    }
}

export const BLINK = new BlinkCard(BLINK_LENGTH)
