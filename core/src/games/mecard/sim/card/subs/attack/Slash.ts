import { blowDamage, meters } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BLOW_DAMAGE, BlowCard } from "./BlowCard"
import { UNIT } from "../../../base/keywords"

/** How far the slash of the catalog reaches, in meters. */
const SLASH_RANGE = 1.3

/** The cosine of half the angle of the slash of the catalog: 0.5 for 60° on each side, an arc of 120°. */
const SLASH_COS_HALF = 0.5

/** A blow in an arc ahead of the unit. */
export class SlashCard extends BlowCard {


    constructor(
        /** How far it reaches, in meters. */
        public readonly range: number,

        /** The cosine of half the angle of its arc. */
        public readonly cosHalf: number,
    ){
        super(
            "Coup d'épée",
            ["Frappe en arc devant, à ", meters(range), " : ", blowDamage(BLOW_DAMAGE), " à chaque ", UNIT, "."],
            Rarity.COMMON, BLOW_DAMAGE,
        )
    }


    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        return {
            kind: "sector", center: pose.position, direction: pose.direction, radius: this.range * progress,
            cosHalf: this.cosHalf,
        }
    }
}

export const SLASH = new SlashCard(SLASH_RANGE, SLASH_COS_HALF)
