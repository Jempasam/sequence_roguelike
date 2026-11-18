import { frenchNumber } from "../../../battle/words"
import { DamageType } from "../../../battle/DamageType"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE, BlowCard } from "./BlowCard"
import { DAGGER_RANGE, DAGGER_WIDTH } from "./Dagger"
import { ALLONGE, DISTANCE, FORCE, UNIT } from "../../../base/keywords"
import * as Areas from "../../../battle/area/Areas"

/** Blows to the left and to the right at once: hit on both sides, whoever is hit is stunned. */
export class SkullBreakCard extends BlowCard {


    constructor(
        /** How far it reaches on each side, in meters. */
        public readonly range: number,

        /** How wide each side is, in meters. */
        public readonly width: number,
    ){
        super("Brisage de crâne", [
            "Frappe à gauche et à droite, à ", frenchNumber(range), "×", ALLONGE, " ", DISTANCE, " : ", BLOW_DAMAGE, "+", FORCE, " ",
            DamageType.PHYSICAL, " à chaque ", UNIT, ". ",
            "Si les deux côtés touchent, toutes les ", UNIT.as("unités"), " touchées sont étourdies.",
        ], Rarity.RARE, BLOW_DAMAGE)
    }


    public reach(_battle: Battle, unit: Unit, pose: Pose, progress: number): Area {
        // From the edge of each side, one band through the body: its own reach on either side of it.
        const toRight = unit.muzzle(pose, pose.direction.right)
        const toLeft = unit.muzzle(pose, pose.direction.left)
        const stretch = pose.direction.right.times(this.range * unit.stats.meleeRange.value * progress)
        return Areas.line(toLeft.minus(stretch), toRight.plus(stretch), this.width)
    }

    protected override land(battle: Battle, unit: Unit, area: Area): Unit[] {
        const hit = super.land(battle, unit, area)
        const onTheRight = (target: Unit): boolean => {
            return unit.direction.right.dot(target.position.minus(unit.position)) > 0
        }
        const bothSides = hit.some(onTheRight) && hit.some(target => !onTheRight(target))
        if(bothSides) for(const target of hit) battle.stun(target)
        return hit
    }
}

export const SKULL_BREAK = new SkullBreakCard(DAGGER_RANGE, DAGGER_WIDTH)
