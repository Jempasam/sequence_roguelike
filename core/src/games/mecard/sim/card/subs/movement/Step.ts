import type { Vector2 } from "../../../base/Vector2"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Pose } from "../../../battle/Action"

import { WALK_SPEED } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { MoveCard } from "./MoveCard"

/** How far the step of the catalog goes, in meters, before the move factor of the unit. */
export const STEP_LENGTH = 2

/** A walk ahead, up to the first obstacle. */
export class StepCard extends MoveCard {


    constructor(length: number){
        super("Avancer", ["Avance de ", length, "×", AGILITE, " ", DISTANCE, ", jusqu'au premier obstacle."], Rarity.COMMON, length, WALK_SPEED)
    }


    public way(pose: Pose): Vector2 {
        return pose.direction
    }
}

export const STEP = new StepCard(STEP_LENGTH)
