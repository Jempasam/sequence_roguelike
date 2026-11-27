import type { Vector2 } from "../../../base/Vector2"
import type { Pose } from "../../../battle/Action"
import { Rarity } from "../../Rarity"

import { DASH_LENGTH, DASH_SPEED, MoveCard } from "./MoveCard"
import type { Impact } from "./MoveCard"
import { AGILITE, DISTANCE, UNIT } from "../../../base/keywords"
import { WALK } from "../../../battle/mecanic/walk/keyword"
import { STUNNED } from "../../../status/subs/Stunned"

/** A dash ahead, stunning the unit it runs into. */
export class StunningDashCard extends MoveCard {


    constructor(length: number, speed: number){
        super("Dash étourdissant", [
            WALK.as("Fonce"), " de ", length, "×", AGILITE, " ", DISTANCE, ". L'", UNIT,
            " percutée gagne ", STUNNED, " ", 1, ".",
        ], Rarity.RARE, length, speed)
    }


    public way(pose: Pose): Vector2 {
        return pose.direction
    }

    public override impact(): Impact {
        return {
            word: STUNNED.name,
            strike: (battle, struck) => {
                if(struck) battle.applyStatus(struck, STUNNED, 1)
            },
        }
    }
}

export const STUNNING_DASH = new StunningDashCard(DASH_LENGTH, DASH_SPEED)
