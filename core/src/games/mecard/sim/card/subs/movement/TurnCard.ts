import type { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH, TURN_LENGTH } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { turn } from "../tools/playing"
import { arrow, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** A card turning its unit a quarter, to its right or to its left. */
export class TurnCard extends ActionCard {


    constructor(
        /** Does it turn to the right, or to the left? */
        public readonly right: boolean,
    ){
        super(
            `Tourner à ${TurnCard.#sideOf(right)}`, `Pivote d'un quart de tour vers la ${TurnCard.#sideOf(right)}.`,
            Rarity.COMMON, TurnCard.#turning(right),
        )
    }


    /** The side a turn goes to, as the player reads it. */
    static #sideOf(right: boolean): string {
        return right ? "droite" : "gauche"
    }

    static #turning(right: boolean): Action {
        const turned = (direction: Vector2) => right ? direction.right : direction.left
        return {
            use: ctx => turn(ctx, turned(ctx.unit.direction)),
            preview: ({ pose }) => {
                const direction = turned(pose.direction)
                const tip = pose.position.plus(direction.times(TURN_LENGTH))
                return still({ ...pose, direction }, arrow([pose.position, tip], MOVE_WIDTH, MOVE_COLOR))
            },
        }
    }
}

export const TURN_LEFT = new TurnCard(false)

export const TURN_RIGHT = new TurnCard(true)
