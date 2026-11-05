import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { pathTo } from "../../../battle/pathfinding"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import { frenchNumber } from "../../../battle/words"
import type { Action, PreviewContext } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, turn, WORD_TIME } from "../tools/playing"
import { arrow, label, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** How far the way of the catalog looks for an enemy, a factor of the vision. */
const PATH_REACH = 0.8

/** What a way to an enemy goes through from a pose, none when there is no enemy in reach. */
function wayOf({ battle, unit, pose }: PreviewContext, reach: number): readonly Vector2[]|null {
    const target = battle.nearestEnemy(unit, unit.stats.aimRange.value * reach, pose.position)
    if(!target) return null
    const path = pathTo(battle, unit, pose.position, target)
    return path.length > 0 ? path : [target.position]
}

/**
 * A turn toward the way to the closest enemy in reach, around what stands between: where to go to come
 * closer, not where the enemy is.
 */
export class PathAimCard extends ActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** How far it looks, a factor of the vision of its unit. */
        public readonly reach: number,
    ){
        super(name, description, rarity, PathAimCard.#aiming(reach))
    }


    static #aiming(reach: number): Action {
        const range = (unit: Unit): number => unit.stats.aimRange.value * reach
        return {
            use: function* (ctx){
                const { battle, unit } = ctx
                const way = wayOf({ battle, unit, pose: unit }, reach)
                if(way){
                    yield* turn(ctx, way[0].minus(unit.position).normalized ?? unit.direction)
                    return
                }
                battle.events.push({ type: "skipped", unit, reason: "personne à viser" })
                yield* hold(battle, WORD_TIME, [label(unit.position, "personne à viser", NOTE_COLOR)])
            },
            preview: ctx => {
                const { unit, pose } = ctx
                const reachShown = polygon({ kind: "circle", center: pose.position, radius: range(unit) }, RANGE_COLOR)
                const way = wayOf(ctx, reach)
                if(!way) return still(pose, reachShown, label(pose.position, "personne à viser", NOTE_COLOR))
                const direction = way[0].minus(pose.position).normalized ?? pose.direction
                const walked = arrow([pose.position, ...way], MOVE_WIDTH, MOVE_COLOR)
                return still({ ...pose, direction }, reachShown, walked)
            },
        }
    }
}

export const PATH_AIM = new PathAimCard("Chemin", [
    "Se tourne vers le chemin qui mène à l'ennemi le plus proche, en contournant les obstacles, jusqu'à la vision × ",
    frenchNumber(PATH_REACH), ".",
], Rarity.COMMON, PATH_REACH)
