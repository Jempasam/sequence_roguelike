import { frenchNumber } from "../../../battle/words"
import { DamageType } from "../../../battle/DamageType"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit, UnitStats } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BlowCard } from "./BlowCard"
import { SHOT_DAMAGE, SHOT_RANGE } from "./Shot"
import { THRUST_WIDTH } from "./Thrust"
import { DISTANCE, PORTEE, PRECISION, UNIT } from "../../../base/keywords"

/** How wide the laser of the catalog is, in meters: two thrusts side by side. */
const LASER_WIDTH = 2 * THRUST_WIDTH

/** A wide beam straight ahead, as far as a shot, through everything on its way. */
export class MegaLaserCard extends BlowCard {


    constructor(
        /** How far it goes, in meters, before the reach of the unit. */
        public readonly range: number,

        /** How wide it is, in meters. */
        public readonly width: number,
    ){
        super("Mégalaser", [
            "Tire un rayon de ", frenchNumber(width), " ", DISTANCE, " de large droit devant, jusqu'à ", range, "×",
            PORTEE, " ", DISTANCE, ", à travers tout : ", SHOT_DAMAGE, "+", PRECISION, " ", DamageType.PHYSICAL,
            " à chaque ", UNIT, ".",
        ], Rarity.EPIC, SHOT_DAMAGE)
    }


    /** The hearts its unit adds to it: its precision, as a shot. */
    public override bonus(stats: UnitStats): number {
        return stats.precision.value
    }

    public reach(_battle: Battle, unit: Unit, pose: Pose, progress: number): Area {
        const length = this.range * unit.stats.throwRange.value * progress
        const to = pose.position.plus(pose.direction.times(length))
        return { kind: "segment", from: pose.position, to, width: this.width }
    }
}

export const MEGA_LASER = new MegaLaserCard(SHOT_RANGE, LASER_WIDTH)
