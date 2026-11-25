import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import type { Battle } from "../../battle/Battle"
import * as Areas from "../../battle/area/Areas"
import type { Preview } from "../../battle/preview/Preview"
import type { PreviewContext } from "../../battle/preview/PreviewContext"
import * as Previews from "../../battle/preview/Previews"
import { MOVE_COLOR, MOVE_WIDTH, RANGE_COLOR } from "../../battle/previewColors"
import type { Unit } from "../../battle/Unit"
import type { Vector2 } from "../../base/Vector2"
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
            for(const { other, away } of this.#reached(battle, unit)){
                battle.push(other, away, STENCH_PUSH, unit)
            }
        })]
    }

    /** The zone of the stench from where its unit stands now, and the units it would push away. */
    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const zone = Areas.circle(pose.position, stenchRadius(this.level))
        const pushes = this.#reached(battle, unit).map(({ other, away }) => {
            const to = other.position.plus(away.times(STENCH_PUSH))
            return Previews.arrow([other.position, to], MOVE_WIDTH / 2, MOVE_COLOR)
        })
        return Previews.still(pose, Previews.polygon(zone, RANGE_COLOR), ...pushes)
    }


    /** The other units within its reach, each with the direction away from its unit. */
    #reached(battle: Battle, unit: Unit): { other: Unit, away: Vector2 }[] {
        const reach = stenchRadius(this.level)
        const reached: { other: Unit, away: Vector2 }[] = []
        for(const other of battle.living){
            if(other === unit) continue
            const offset = other.position.minus(unit.position)
            const away = offset.normalized
            if(away && offset.length <= reach) reached.push({ other, away })
        }
        return reached
    }
}
