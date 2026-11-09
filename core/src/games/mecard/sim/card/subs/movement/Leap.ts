import type { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Action, Indicator, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, wait } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** How far the jump of the catalog goes, in meters, before the agility of the unit. */
const LEAP_LENGTH = 3

/** How long a jump takes to leave and to land, in seconds. */
export const LEAP_TIME = 0.12

/** What a jump from a point to another shows: its way, and a word when it lands where it has no room. */
export function leapShown(battle: Battle, unit: Unit, from: Vector2, to: Vector2): Indicator[] {
    const way = arrow([from, to], MOVE_WIDTH / 2, MOVE_COLOR)
    return battle.free(to, unit) ? [way] : [way, label(to, "éjecté", NOTE_COLOR)]
}

/** A jump ahead, over everything: landing where there is no room costs a heart and a throw aside. */
export class LeapCard extends ActionCard {


    constructor(
        /** How far it goes, in meters, before the agility of the unit. */
        public readonly length: number,
    ){
        super("Saut", [
            "Saute de ", length, "×", AGILITE, " ", DISTANCE, " devant, par-dessus tout. Mal retombé, tu perds 1 cœur et tu es éjecté à côté, ",
            "tant qu'il le faut.",
        ], Rarity.COMMON, LeapCard.#leaping(length))
    }


    static #leaping(length: number): Action {
        const target = (unit: Unit, pose: Pose): Vector2 => {
            return pose.position.plus(pose.direction.times(length * unit.stats.move.value))
        }
        return {
            use: function* ({ battle, unit }){
                const to = target(unit, unit)
                yield* hold(battle, LEAP_TIME, [arrow([unit.position, to], MOVE_WIDTH / 2, MOVE_COLOR)])
                if(battle.leap(unit, to)) battle.unblock(unit)
                yield* wait(LEAP_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const to = target(unit, pose)
                return still({ ...pose, position: to }, ...leapShown(battle, unit, pose.position, to))
            },
        }
    }
}

export const LEAP = new LeapCard(LEAP_LENGTH)
