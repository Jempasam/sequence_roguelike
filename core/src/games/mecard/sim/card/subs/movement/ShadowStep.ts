import { Vector2 } from "../../../base/Vector2"
import { MOVE_COLOR, MOVE_WIDTH } from "../../../battle/previewColors"
import { meters } from "../../../battle/words"
import type { Action } from "../../../battle/Action"
import type { Arena } from "../../../battle/Arena"

import { ActionCard } from "../ActionCard"
import { TRAVEL_SLACK, travel, wait } from "../tools/playing"
import { arrow } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { DASH_SPEED } from "./MoveCard"

/** How far the shadow step of the catalog goes, in meters, before the agility of the unit. */
const SHADOW_STEP_LENGTH = 2

/** How far from a wall a body may stand to have run into it, in meters: a stride of a move. */
const WALL_SLACK = 0.06

/** How long the unit stays still around its jump, in seconds. */
const JUMP_TIME = 0.1

/**
 * Where a body stopped by a wall of the arena comes back, on the opposite side, along the same line: none
 * when it stands against no wall it was going to.
 */
function across(arena: Arena, at: Vector2, way: Vector2, radius: number): Vector2|null {
    const reach = radius + WALL_SLACK
    const left = way.x < 0 && at.x <= reach
    const right = way.x > 0 && at.x >= arena.width - reach
    const top = way.y < 0 && at.y <= reach
    const bottom = way.y > 0 && at.y >= arena.height - reach
    if(!left && !right && !top && !bottom) return null
    const x = left ? arena.width - radius : right ? radius : at.x
    const y = top ? arena.height - radius : bottom ? radius : at.y
    return new Vector2(x, y)
}

/**
 * Where a body standing at a point would stand beyond each wall of the arena, were the arena laid out again
 * past it: what {@link across} leads to, so what is near one of them is near through that wall.
 */
export function shadowImages(arena: Arena, at: Vector2, radius: number): Vector2[] {
    const wide = arena.width - 2 * radius
    const high = arena.height - 2 * radius
    return [
        at.plus(new Vector2(wide, 0)), at.plus(new Vector2(-wide, 0)),
        at.plus(new Vector2(0, high)), at.plus(new Vector2(0, -high)),
    ]
}

/** A walk ahead: run into a wall of the arena, the unit comes back by the opposite one and goes on. */
export class ShadowStepCard extends ActionCard {


    constructor(
        /** How far it goes, in meters, before the agility of the unit. */
        public readonly length: number,
    ){
        super("Pas de l'ombre", [
            "Avance de ", meters(length), ". Arrêté par un mur de l'arène, tu ressors par le mur opposé, à la ",
            "même hauteur, et tu repars de ", meters(length), ".",
        ], Rarity.RARE, ShadowStepCard.#stepping(length))
    }


    static #stepping(length: number): Action {
        return {
            use: function* (ctx){
                const { battle, unit } = ctx
                const distance = length * unit.stats.move.value
                const gone = yield* travel(ctx, unit.direction, distance, DASH_SPEED)
                const { position, direction, radius } = unit
                const wall = gone.struck ? null : across(battle.arena, position, direction, radius)
                if(wall && gone.distance < distance - TRAVEL_SLACK && battle.leap(unit, wall)){
                    battle.unblock(unit)
                    yield* wait(JUMP_TIME)
                    yield* travel(ctx, unit.direction, distance, DASH_SPEED)
                }
                yield* wait(JUMP_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const distance = length * unit.stats.move.value
                const gone = battle.travel(unit, pose.position, pose.direction, distance)
                const shown = [arrow([pose.position, gone.to], MOVE_WIDTH, MOVE_COLOR)]
                const wall = gone.struck ? null : across(battle.arena, gone.to, pose.direction, unit.radius)
                if(!wall || gone.distance >= distance){
                    return { indicators: shown, pose: { ...pose, position: gone.to } }
                }
                const again = battle.travel(unit, wall, pose.direction, distance)
                shown.push(arrow([wall, again.to], MOVE_WIDTH, MOVE_COLOR))
                return { indicators: shown, pose: { ...pose, position: again.to } }
            },
        }
    }
}

export const SHADOW_STEP = new ShadowStepCard(SHADOW_STEP_LENGTH)
