import type { Vector2 } from "../../../base/Vector2"
import type { Pose } from "../../../battle/Action"
import { Rarity } from "../../Rarity"

import { DASH_LENGTH, DASH_SPEED, MoveCard } from "./MoveCard"
import type { Impact } from "./MoveCard"
import { AGILITE, DISTANCE, UNIT } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"

/** How many hearts the ram of the catalog takes. */
const RAM_DAMAGE = 2

/** A dash ahead, wounding the unit it runs into. */
export class RamCard extends MoveCard {


    constructor(
        length: number, speed: number,

        /** How many hearts it takes. */
        public readonly amount: number,
    ){
        super("Dash dégât", [
            "Fonce de ", length, "×", AGILITE, " ", DISTANCE, ". L'", UNIT, " percutée prend ", amount, " ",
            DamageType.PHYSICAL, ".",
        ], Rarity.RARE, length, speed)
    }


    public way(pose: Pose): Vector2 {
        return pose.direction
    }

    public override impact(): Impact {
        return {
            word: "percuté",
            strike: (_battle, struck, mover) => {
                if(struck) struck.hearts.damage(this.amount, DamageType.PHYSICAL, mover)
            },
        }
    }
}

export const RAM = new RamCard(DASH_LENGTH, DASH_SPEED, RAM_DAMAGE)
