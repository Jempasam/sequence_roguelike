import type { Vector2 } from "../../../base/Vector2"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Pose } from "../../../battle/Action"
import { Rarity } from "../../Rarity"

import { DASH_LENGTH, DASH_SPEED, MoveCard } from "./MoveCard"

/** A dash backward, still facing ahead. */
export class BackDashCard extends MoveCard {


    constructor(length: number, speed: number){
        super("Dash arrière", ["Recule de ", length, "×", AGILITE, " ", DISTANCE, " sans se retourner."], Rarity.COMMON, length, speed)
    }


    public way(pose: Pose): Vector2 {
        return pose.direction.opposite
    }
}

export const BACK_DASH = new BackDashCard(DASH_LENGTH, DASH_SPEED)
