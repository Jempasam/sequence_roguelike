import { MOVE_COLOR, MOVE_WIDTH } from "../../../battle/previewColors"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { wait } from "../tools/playing"
import { WALK } from "../../../battle/mecanic/walk/keyword"
import * as Walk from "../../../battle/mecanic/walk"
import { Rarity } from "../../Rarity"
import { DASH_SPEED } from "./MoveCard"
import * as Previews from "../../../battle/preview/Previews"

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
        super("Pas de Cavalier", [
            WALK.as("Se décale"), " de ", side, "×", AGILITE, " ", DISTANCE, " à droite, puis ", WALK.as("avance"), " de ", ahead, "×", AGILITE, " ",
            DISTANCE, ", sans se retourner.",
        ], Rarity.COMMON, KnightMoveCard.#moving(side, ahead))
    }


    static #moving(side: number, ahead: number): Action {
        return {
            use: function (ctx){
                const { unit } = ctx
                Walk.travel(ctx, unit.direction.right, side * unit.stats.move.value, DASH_SPEED)
                wait(ctx.battle, TURN_TIME)
                Walk.travel(ctx, unit.direction, ahead * unit.stats.move.value, DASH_SPEED)
                wait(ctx.battle, TURN_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const { move } = unit.stats
                const first = Walk.spot(battle, unit, pose.position, pose.direction.right, side * move.value)
                const second = Walk.spot(battle, unit, first.to, pose.direction, ahead * move.value)
                const path = Previews.arrow([pose.position, first.to, second.to], MOVE_WIDTH, MOVE_COLOR)
                return Previews.still({ ...pose, position: second.to }, path, Previews.body(unit, second.to, pose.direction))
            },
        }
    }
}

export const KNIGHT_MOVE = new KnightMoveCard(KNIGHT_SIDE, KNIGHT_AHEAD)
