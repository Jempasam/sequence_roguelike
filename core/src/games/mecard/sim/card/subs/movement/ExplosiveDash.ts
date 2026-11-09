import type { Vector2 } from "../../../base/Vector2"
import type { Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { DASH_LENGTH, DASH_SPEED, MoveCard } from "./MoveCard"
import type { Impact } from "./MoveCard"
import { AGILITE, DISTANCE, PORTEE, UNIT } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"
import { frenchNumber } from "../../../battle/words"

/** How far the blast of the explosive dash of the catalog reaches, in meters, before the reach. */
const DASH_BLAST_RADIUS = 1.2

/** How many hearts the blast of the explosive dash of the catalog takes. */
const DASH_BLAST_DAMAGE = 2

/** A dash ahead, blowing up whatever it runs into, a body, a pillar or a wall: the dasher is spared. */
export class ExplosiveDashCard extends MoveCard {


    constructor(
        length: number, speed: number,

        /** How far the blast reaches, in meters, before the reach of the unit. */
        public readonly radius: number,

        /** How many hearts the blast takes from each unit. */
        public readonly blast: number,
    ){
        super("Dash explosif", [
            "Fonce de ", length, "×", AGILITE, " ", DISTANCE, ". S'il percute quoi que ce soit, tout explose à ",
            frenchNumber(radius), "×", PORTEE, " ", DISTANCE, " autour : ", blast, " ", DamageType.PHYSICAL, " à chaque ", UNIT,
            ", sauf toi.",
        ], Rarity.RARE, length, speed)
    }


    public way(pose: Pose): Vector2 {
        return pose.direction
    }

    public override impact(): Impact {
        return {
            word: "boum", anything: true,
            area: (unit, stop) => this.#blastArea(unit, stop),
            strike: (battle, _struck, mover) => {
                battle.explode(this.#blastArea(mover, mover), this.blast, mover, mover)
            },
        }
    }


    /** What its blast reaches, for a unit stopped at a pose: around the front of its body. */
    #blastArea(unit: Unit, stop: Pose): Area {
        const center = stop.position.plus(stop.direction.times(unit.radius))
        return { kind: "circle", center, radius: this.radius * unit.stats.throwRange.value }
    }
}

export const EXPLOSIVE_DASH = new ExplosiveDashCard(
    DASH_LENGTH, DASH_SPEED, DASH_BLAST_RADIUS, DASH_BLAST_DAMAGE,
)
