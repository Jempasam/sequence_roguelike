import { blowDamage, HeartCount, meters } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE, BlowCard } from "./BlowCard"
import { UNIT } from "../../../base/keywords"

/** How far the axe of the catalog reaches all around, in meters. */
const AXE_RANGE = 1.2

/** How many hearts the axe of the catalog fills again for each unit hit. */
const AXE_HEAL = 1

/** A blow all around the unit, filling its hearts again for each unit hit. */
export class BloodAxeCard extends BlowCard {


    constructor(
        /** How far it reaches all around, in meters. */
        public readonly range: number,

        /** How many hearts it fills again for each unit hit. */
        public readonly heal: number,
    ){
        super("Hache buveuse de sang", [
            "Frappe tout autour, à ", meters(range), " : ", blowDamage(BLOW_DAMAGE), " à chaque ", UNIT, ". Remplit ",
            new HeartCount(heal), " par ", UNIT, " touchée.",
        ], Rarity.EPIC, BLOW_DAMAGE)
    }


    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        return { kind: "circle", center: pose.position, radius: this.range * progress }
    }

    protected override land(battle: Battle, unit: Unit, area: Area): Unit[] {
        const hit = super.land(battle, unit, area)
        unit.hearts.heal(hit.length * this.heal)
        return hit
    }
}

export const BLOOD_AXE = new BloodAxeCard(AXE_RANGE, AXE_HEAL)
