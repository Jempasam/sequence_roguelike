import type { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH } from "../../../battle/previewColors"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { wait } from "../tools/playing"
import { WALK } from "../../../battle/mecanic/walk/keyword"
import * as Turn from "../../../battle/mecanic/turn"
import * as Walk from "../../../battle/mecanic/walk"
import { reflected } from "../tools/reflection"
import { Rarity } from "../../Rarity"
import { DASH_SPEED } from "./MoveCard"
import * as Previews from "../../../battle/preview/Previews"

/** How far each leg of the dash of the catalog goes, in meters, before the agility of the unit. */
const BOUNCE_LENGTH = 1.5

/** How many times the dash of the catalog bounces at most. */
const MAX_BOUNCES = 4

/** How far from what stopped it a body may stand, in meters: a stride of a move. */
const STOP_SLACK = 0.06

/** How long the unit stays still once its dash is over, in seconds. */
const SETTLE_TIME = 0.08

/** A short dash bouncing off what stops it, each bounce a whole leg again. */
export class BounceDashCard extends ActionCard {


    constructor(
        /** How far each leg goes, in meters, before the agility of the unit. */
        public readonly length: number,

        /** How many times it bounces at most. */
        public readonly bounces: number,
    ){
        super("Bounce Dash", [
            WALK.as("Fonce"), " de ", length, "×", AGILITE, " ", DISTANCE, ". Arrêté en route, tu rebondis et ",
            WALK.as("repars"), " de ",
            length, "×", AGILITE, " ", DISTANCE, ", ", bounces, " rebonds au plus.",
        ], Rarity.RARE, BounceDashCard.#dashing(length, bounces))
    }


    static #dashing(length: number, bounces: number): Action {
        return {
            use: function (ctx){
                const { battle, unit } = ctx
                const leg = length * unit.stats.move.value
                for(let bounce = 0; bounce <= bounces && unit.alive; bounce++){
                    const gone = Walk.travel(ctx, unit.direction, leg, DASH_SPEED)
                    const stopped = gone.distance < leg - Walk.TRAVEL_SLACK && unit.stats.mobility.value > 0
                    if(!stopped || bounce === bounces) break
                    const { position, direction, radius } = unit
                    const way = reflected(battle, position, direction, radius, STOP_SLACK, gone.struck)
                    if(!way) break
                    Turn.turn(battle, unit, way)
                }
                wait(battle, SETTLE_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const leg = length * unit.stats.move.value
                const points: Vector2[] = [pose.position]
                let { position, direction } = pose
                for(let bounce = 0; bounce <= bounces; bounce++){
                    const gone = Walk.spot(battle, unit, position, direction, leg)
                    position = gone.to
                    points.push(position)
                    if(gone.distance >= leg - Walk.TRAVEL_SLACK || bounce === bounces) break
                    const way = reflected(battle, position, direction, unit.radius, STOP_SLACK, gone.struck)
                    if(!way) break
                    direction = way
                }
                return { indicators: [Previews.arrow(points, MOVE_WIDTH, MOVE_COLOR)], pose: { position, direction } }
            },
        }
    }
}

export const BOUNCE_DASH = new BounceDashCard(BOUNCE_LENGTH, MAX_BOUNCES)
