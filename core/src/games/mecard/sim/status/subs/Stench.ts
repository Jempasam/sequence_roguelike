import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { BATTLE_ROUND, BATTLE_TURN } from "../../base/keywords"

/** How far a stench reaches around its unit whatever its level, in meters. */
export const STENCH_BASE_RADIUS = 0.5

/** How much farther a stench reaches for each level, in meters. */
export const STENCH_RADIUS_PER_LEVEL = 0.25

/** How far a stench pushes each unit it reaches, in meters. */
export const STENCH_PUSH = 1

/** How far a stench of a level reaches around its unit, in meters. */
export function stenchRadius(level: number): number {
    return STENCH_BASE_RADIUS + level * STENCH_RADIUS_PER_LEVEL
}

/** A stench: after each step the unit plays, the units close to it are pushed away, for some rounds. */
export const STINKING = new StatusType("puanteur", statusVisual("stench", 0.55, 0.65, 0.2), "negative", level => new Stench(level), {
    description: [
        "Après chaque ", BATTLE_TURN.as("étape"), " qu'elle joue, repousse de ", STENCH_PUSH, " m les unités à moins de ", STENCH_BASE_RADIUS,
        " m plus ", STENCH_RADIUS_PER_LEVEL, " m par ", BATTLE_ROUND, " restant, pendant ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), ".",
    ],
})

/** Stinking: after each of its steps, every other unit within reach of it is pushed away from it. */
export class Stench extends RoundStatus {


    public readonly type: StatusType = STINKING

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [unit.stepEnded.add(() => {
            const reach = stenchRadius(this.level)
            for(const other of battle.living){
                if(other === unit) continue
                const offset = other.position.minus(unit.position)
                const away = offset.normalized
                if(away && offset.length <= reach) battle.push(other, away, STENCH_PUSH, unit)
            }
        })]
    }
}
