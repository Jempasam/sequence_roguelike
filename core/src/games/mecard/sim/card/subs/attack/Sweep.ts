import { blowDamage, meters } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE, BlowCard } from "./BlowCard"
import { UNIT } from "../../../base/keywords"

/** How far the sweep of the catalog reaches all around, in meters. */
const SWEEP_RANGE = 1.2

/** A blow all around the unit. */
export class SweepCard extends BlowCard {


    constructor(
        /** How far it reaches all around, in meters. */
        public readonly range: number,
    ){
        super(
            "Coup circulaire",
            ["Frappe tout autour, à ", meters(range), " : ", blowDamage(BLOW_DAMAGE), " à chaque ", UNIT, "."],
            Rarity.RARE, BLOW_DAMAGE,
        )
    }


    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        return { kind: "circle", center: pose.position, radius: this.range * progress }
    }
}

export const SWEEP = new SweepCard(SWEEP_RANGE)
