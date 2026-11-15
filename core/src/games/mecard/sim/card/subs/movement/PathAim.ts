import type { Text } from "../../../../../../semantic"
import type { Vector2 } from "../../../base/Vector2"
import { pathTo } from "../../../battle/pathfinding"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import type { PreviewContext } from "../../../battle/preview/PreviewContext"
import { ActionCard } from "../ActionCard"
import { hold, turn, WORD_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** What a way to an enemy goes through from a pose, none when there is no enemy. */
function wayOf({ battle, unit, pose }: PreviewContext): readonly Vector2[]|null {
    const target = battle.nearestEnemy(unit, Infinity, pose.position)
    if(!target) return null
    const path = pathTo(battle, unit, pose.position, target)
    return path.length > 0 ? path : [target.position]
}

/**
 * A turn toward the way to the closest enemy, around what stands between: where to go to come closer, not
 * where the enemy is.
 */
export class PathAimCard extends ActionCard {


    constructor(name: string, description: Text, rarity: Rarity){
        super(name, description, rarity, PathAimCard.#aiming())
    }


    static #aiming(): Action {
        return {
            use: function (ctx){
                const { battle, unit } = ctx
                const way = wayOf({ battle, unit, pose: unit })
                if(way){
                    turn(ctx, way[0].minus(unit.position).normalized ?? unit.direction)
                    return
                }
                battle.events.push({ type: "skipped", unit, reason: "personne à viser" })
                hold(battle, WORD_TIME, [Previews.label(unit.position, "personne à viser", NOTE_COLOR)])
            },
            preview: ctx => {
                const { pose } = ctx
                const way = wayOf(ctx)
                if(!way) return Previews.still(pose, Previews.label(pose.position, "personne à viser", NOTE_COLOR))
                const direction = way[0].minus(pose.position).normalized ?? pose.direction
                const walked = Previews.arrow([pose.position, ...way], MOVE_WIDTH, MOVE_COLOR)
                return Previews.still({ ...pose, direction }, walked)
            },
        }
    }
}

export const PATH_AIM = new PathAimCard("Chemin", [
    "Se tourne vers le chemin qui mène à l'ennemi le plus proche, en contournant les obstacles.",
], Rarity.COMMON)
