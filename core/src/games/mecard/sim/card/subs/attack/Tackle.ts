import { blowDamage, meters } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BlowCard } from "./BlowCard"
import { UNIT } from "../../../base/keywords"

/** How many hearts the tackle of the catalog takes, before the strength of the unit. */
const TACKLE_DAMAGE = 1

/** How far the tackle of the catalog reaches, in meters. */
const TACKLE_RANGE = 1

/** The cosine of half the angle of the tackle of the catalog: an arc of 120°. */
const TACKLE_COS_HALF = 0.5

/** A short blow ahead, leaving each unit it touches with its back turned: what a dagger waits for. */
export class TackleCard extends BlowCard {


    constructor(
        /** How far it reaches, in meters. */
        public readonly range: number,

        /** The cosine of half the angle of its arc. */
        public readonly cosHalf: number,
    ){
        super("Tacle", [
            "Fauche en arc devant, à ", meters(range), " : chaque ", UNIT, " touchée te tourne le dos et prend ",
            blowDamage(TACKLE_DAMAGE), ".",
        ], Rarity.RARE, TACKLE_DAMAGE)
    }


    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        return {
            kind: "sector", center: pose.position, direction: pose.direction, radius: this.range * progress,
            cosHalf: this.cosHalf,
        }
    }

    protected override land(battle: Battle, unit: Unit, area: Area): Unit[] {
        for(const target of battle.unitsIn(area, unit)){
            const away = target.position.minus(unit.position).normalized
            if(away) battle.turn(target, away)
        }
        return super.land(battle, unit, area)
    }
}

export const TACKLE = new TackleCard(TACKLE_RANGE, TACKLE_COS_HALF)
