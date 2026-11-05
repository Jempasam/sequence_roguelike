import { blowDamage, meters } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BlowCard } from "./BlowCard"
import { UNIT } from "../../../base/keywords"

/** How many hearts the scythe of the catalog takes, before the strength of the unit. */
const SCYTHE_DAMAGE = 1

/** How far from the unit the blade of the scythe of the catalog starts, in meters. */
const SCYTHE_INNER = 1

/** How far the blade of the scythe of the catalog reaches, in meters. */
const SCYTHE_OUTER = 2

/** The cosine of half the angle of the scythe of the catalog: an arc of 120°. */
const SCYTHE_COS_HALF = 0.5

/** A blow in a crescent ahead of the unit, starting away from it: what stands close is not touched. */
export class ScytheCard extends BlowCard {


    constructor(
        /** How far from the unit its blade starts, in meters. */
        public readonly inner: number,

        /** How far its blade reaches, in meters. */
        public readonly outer: number,

        /** The cosine of half the angle of its arc. */
        public readonly cosHalf: number,
    ){
        super("Faux", [
            "Fauche en arc devant, de ", meters(inner), " à ", meters(outer), " : ", blowDamage(SCYTHE_DAMAGE),
            " à chaque ", UNIT, ". Ce qui est plus près n'est pas touché.",
        ], Rarity.RARE, SCYTHE_DAMAGE)
    }


    public reach(_battle: Battle, _unit: Unit, pose: Pose, progress: number): Area {
        return {
            kind: "crescent", center: pose.position, direction: pose.direction,
            inner: this.inner * progress, radius: this.outer * progress, cosHalf: this.cosHalf,
        }
    }
}

export const SCYTHE = new ScytheCard(SCYTHE_INNER, SCYTHE_OUTER, SCYTHE_COS_HALF)
