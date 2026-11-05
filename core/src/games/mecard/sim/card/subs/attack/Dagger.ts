import type { Text } from "../../../../../../semantic"
import { blowDamage, meters } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE, BlowCard } from "./BlowCard"
import { UNIT } from "../../../base/keywords"

/** How far the dagger of the catalog reaches, in meters: shorter than a thrust. */
export const DAGGER_RANGE = 1.1

/** How wide the dagger of the catalog is, in meters. */
export const DAGGER_WIDTH = 0.4

/** How many times the dagger hurts a unit stabbed in the back. */
export const BACKSTAB = 2

/**
 * Is a unit stabbed in its back by another: does it face away from the other, within an eighth of a turn on
 * either side? The cosine of an eighth, so no trigonometry is needed.
 */
export function inTheBack(target: Unit, attacker: Unit): boolean {
    const away = target.position.minus(attacker.position).normalized
    return away !== null && target.direction.dot(away) >= Math.SQRT1_2
}

/** A short stab ahead, through everything on its line, twice as hard in the back. */
export class DaggerCard extends BlowCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How far it reaches, in meters. */
        public readonly range: number,

        /** How wide it is, in meters. */
        public readonly width: number,

        /** How many times it hurts a unit stabbed in the back. */
        public readonly backstab: number,
    ){
        super(name, description, rarity, BLOW_DAMAGE)
    }


    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        const to = pose.position.plus(pose.direction.times(this.range * progress))
        return { kind: "segment", from: pose.position, to, width: this.width }
    }

    protected override land(battle: Battle, unit: Unit, area: Area): Unit[] {
        const amount = this.damage + this.bonus(unit.stats)
        return battle.strike(unit, area, amount, "physical", target => this.scale(target, unit))
    }

    /** How many times it hurts a unit: more in the back. */
    protected scale(target: Unit, unit: Unit): number {
        return inTheBack(target, unit) ? this.backstab : 1
    }
}

export const DAGGER = new DaggerCard("Dague", [
    "Poignarde sur ", meters(DAGGER_RANGE), " devant : ", blowDamage(BLOW_DAMAGE), " à chaque ", UNIT, ", ×", String(BACKSTAB),
    " dans le dos.",
], Rarity.COMMON, DAGGER_RANGE, DAGGER_WIDTH, BACKSTAB)
