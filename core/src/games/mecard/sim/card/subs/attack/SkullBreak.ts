import { blowDamage, meters } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE, BlowCard } from "./BlowCard"
import { DAGGER_RANGE, DAGGER_WIDTH } from "./Dagger"
import { UNIT } from "../../../base/keywords"

/** Blows to the left and to the right at once: hit on both sides, whoever is hit is stunned. */
export class SkullBreakCard extends BlowCard {


    constructor(
        /** How far it reaches on each side, in meters. */
        public readonly range: number,

        /** How wide each side is, in meters. */
        public readonly width: number,
    ){
        super("Brisage de crâne", [
            "Frappe à gauche et à droite, à ", meters(range), " : ", blowDamage(BLOW_DAMAGE), " à chaque ", UNIT, ". ",
            "Si les deux côtés touchent, toutes les ", UNIT.as("unités"), " touchées sont étourdies.",
        ], Rarity.RARE, BLOW_DAMAGE)
    }


    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        const side = pose.direction.right.times(this.range * progress)
        return { kind: "segment", from: pose.position.minus(side), to: pose.position.plus(side), width: this.width }
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
