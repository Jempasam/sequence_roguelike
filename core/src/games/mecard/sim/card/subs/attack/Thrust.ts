import { blowDamage, meters } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE, BlowCard } from "./BlowCard"
import { UNIT } from "../../../base/keywords"

/** How far the thrust of the catalog goes through, in meters. */
const THRUST_RANGE = 2

/** How wide the thrust of the catalog is, in meters. */
export const THRUST_WIDTH = 0.5

/** A blow through everything on a line ahead of the unit. */
export class ThrustCard extends BlowCard {


    constructor(
        /** How far it goes through, in meters. */
        public readonly range: number,

        /** How wide it is, in meters. */
        public readonly width: number,
    ){
        super(
            "Estoc",
            ["Transperce tout sur ", meters(range), " devant : ", blowDamage(BLOW_DAMAGE), " à chaque ", UNIT, "."],
            Rarity.COMMON, BLOW_DAMAGE,
        )
    }


    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        const to = pose.position.plus(pose.direction.times(this.range * progress))
        return { kind: "segment", from: pose.position, to, width: this.width }
    }
}

export const THRUST = new ThrustCard(THRUST_RANGE, THRUST_WIDTH)
