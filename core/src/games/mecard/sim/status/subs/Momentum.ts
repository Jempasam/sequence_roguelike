import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { DamageType } from "../../battle/DamageType"
import { ScalingStatus } from "../ScalingStatus"
import type { StatGain } from "../ScalingStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** How much farther, as a factor, a round of momentum makes the moves go. */
export const MOMENTUM_MOVE = 0.25

/** From which level a momentum hurts what stops it. */
export const MOMENTUM_RAM_LEVEL = 2

/** The cosine of the turn, 10°, past which a unit loses its momentum. */
const TURN_COS = Math.cos(10 * Math.PI / 180)

/** A momentum: the moves go farther, and a unit going fast enough hurts what stops it. */
export const MOMENTUM = new StatusType("élan", statusVisual("momentum", 1, 0.7, 0.3), "positive", level => new Momentum(level), {
    description: [
        "Chaque déplacement va plus loin pour chaque round restant (", STATUS_LEVEL, "). À partir de ", MOMENTUM_RAM_LEVEL,
        " rounds, un déplacement arrêté par une unité lui inflige autant de dégâts, et l'élan est perdu. Tourner de plus de 10° le fait perdre.",
    ],
})

/** Momentum: its moves go farther for each round left, and it rams what stops it, then loses all. */
export class Momentum extends ScalingStatus {


    public readonly type: StatusType = MOMENTUM

    protected gains(level: number): readonly StatGain[] {
        return [{ stat: stats => stats.move, amount: MOMENTUM_MOVE * level }]
    }

    protected override watch({ battle, unit }: UnitContext): Observer[] {
        return [
            battle.signals.bumped.add(({ unit: bumper, struck }) => {
                if(bumper !== unit || this.level < MOMENTUM_RAM_LEVEL) return
                struck.hearts.damage(this.level, DamageType.PHYSICAL, unit)
                battle.removeStatus(unit, MOMENTUM)
            }),
            battle.signals.moved.add(({ unit: mover, from, to }) => {
                if(mover !== unit || from.direction.dot(to.direction) >= TURN_COS) return
                battle.removeStatus(unit, MOMENTUM)
            }),
        ]
    }
}
