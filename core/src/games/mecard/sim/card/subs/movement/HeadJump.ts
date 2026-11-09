import { MOVE_COLOR, MOVE_WIDTH } from "../../../battle/previewColors"
import { AGILITE, DISTANCE, FORCE } from "../../../base/keywords"
import type { Action } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, wait } from "../tools/playing"
import { arrow } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { LEAP_TIME, leapShown } from "./Leap"
import { DamageType } from "../../../battle/DamageType"

/** How far each jump of the catalog goes, in meters, before the agility of the unit. */
const HEAD_JUMP_LENGTH = 2

/** How many hearts each landing of the catalog takes, before the strength of the unit. */
const HEAD_JUMP_DAMAGE = 1

/** How many times the jump of the catalog goes at most. */
const HEAD_JUMPS = 3

/** The ground under a unit: its whole body. */
function under(unit: Unit): Area {
    return { kind: "circle", center: unit.position, radius: unit.radius }
}

/** A jump ahead: landing on a body wounds it and jumps again, a few times at most. */
export class HeadJumpCard extends ActionCard {


    constructor(
        /** How far each jump goes, in meters, before the agility of the unit. */
        public readonly length: number,

        /** How many hearts each landing takes, before the strength of the unit. */
        public readonly amount: number,

        /** How many times it jumps at most. */
        public readonly jumps: number,
    ){
        super("Saut sur tête", [
            "Saute de ", length, "×", AGILITE, " ", DISTANCE, " devant, par-dessus tout. Sur un corps : ", amount, "+",
            FORCE, " ", DamageType.PHYSICAL, ", et tu ressautes, ", jumps, " sauts au plus. Mal retombé, tu perds 1 cœur et tu es éjecté.",
        ], Rarity.RARE, HeadJumpCard.#jumping(length, amount, jumps))
    }


    static #jumping(length: number, amount: number, jumps: number): Action {
        return {
            use: function* ({ battle, unit }){
                for(let jump = 0; jump < jumps && unit.alive; jump++){
                    const to = unit.position.plus(unit.direction.times(length * unit.stats.move.value))
                    yield* hold(battle, LEAP_TIME, [arrow([unit.position, to], MOVE_WIDTH / 2, MOVE_COLOR)])
                    if(!battle.leap(unit, to)) return
                    const area = under(unit)
                    if(battle.unitsIn(area, unit).length === 0) break
                    battle.strike(unit, area, amount + unit.stats.strength.value, DamageType.PHYSICAL)
                }
                battle.unblock(unit)
                yield* wait(LEAP_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const to = pose.position.plus(pose.direction.times(length * unit.stats.move.value))
                const indicators = leapShown(battle, unit, pose.position, to)
                return { indicators, pose: { ...pose, position: to } }
            },
        }
    }
}

export const HEAD_JUMP = new HeadJumpCard(HEAD_JUMP_LENGTH, HEAD_JUMP_DAMAGE, HEAD_JUMPS)
