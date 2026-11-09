import type { Vector2 } from "../../../base/Vector2"
import type { Pose } from "../../../battle/Action"
import { Rarity } from "../../Rarity"

import { DASH_LENGTH, DASH_SPEED, MoveCard } from "./MoveCard"
import type { Impact } from "./MoveCard"
import { AGILITE, DISTANCE, UNIT } from "../../../base/keywords"

/** A dash ahead, stunning the unit it runs into. */
export class StunningDashCard extends MoveCard {


    constructor(length: number, speed: number){
        super("Dash étourdissant", [
            "Fonce de ", length, "×", AGILITE, " ", DISTANCE, ". L'", UNIT, " percutée est étourdie : sa prochaine étape est perdue.",
        ], Rarity.RARE, length, speed)
    }


    public way(pose: Pose): Vector2 {
        return pose.direction
    }

    public override impact(): Impact {
        return {
            word: "étourdi",
            strike: (battle, struck) => {
                if(struck) battle.stun(struck)
            },
        }
    }
}

export const STUNNING_DASH = new StunningDashCard(DASH_LENGTH, DASH_SPEED)
