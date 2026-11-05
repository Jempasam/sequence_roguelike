import { MOVE_COLOR, MOVE_WIDTH } from "../../../battle/previewColors"
import { meters } from "../../../battle/words"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { travel, wait } from "../tools/playing"
import { arrow, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { DASH_SPEED } from "./MoveCard"

/** How far the knight of the catalog goes to its right, in meters, before the agility of the unit. */
const KNIGHT_SIDE = 1

/** How far the knight of the catalog then goes ahead, in meters, before the agility of the unit. */
const KNIGHT_AHEAD = 2

/** How long the unit stays still between the two moves, in seconds. */
const TURN_TIME = 0.05

/** A move as a chess knight: to the side, then ahead, without turning. */
export class KnightMoveCard extends ActionCard {


    constructor(
        /** How far it goes to the right, in meters, before the agility of the unit. */
        public readonly side: number,

        /** How far it then goes ahead, in meters, before the agility of the unit. */
        public readonly ahead: number,
    ){
        super("Cavalier", [
            "Se décale de ", meters(side), " à droite, puis avance de ", meters(ahead), ", sans se retourner.",
        ], Rarity.COMMON, KnightMoveCard.#moving(side, ahead))
    }


    static #moving(side: number, ahead: number): Action {
        return {
            use: function* (ctx){
                const { unit } = ctx
                yield* travel(ctx, unit.direction.right, side * unit.stats.move.value, DASH_SPEED)
                yield* wait(TURN_TIME)
                yield* travel(ctx, unit.direction, ahead * unit.stats.move.value, DASH_SPEED)
                yield* wait(TURN_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const { move } = unit.stats
                const first = battle.travel(unit, pose.position, pose.direction.right, side * move.value)
                const second = battle.travel(unit, first.to, pose.direction, ahead * move.value)
                const path = arrow([pose.position, first.to, second.to], MOVE_WIDTH, MOVE_COLOR)
                return still({ ...pose, position: second.to }, path)
            },
        }
    }
}

export const KNIGHT_MOVE = new KnightMoveCard(KNIGHT_SIDE, KNIGHT_AHEAD)
