import type { Vector2 } from "../../../base/Vector2"
import type { Action, Preview } from "../../../battle/Action"

import { ModifierCard } from "../ModifierCard"
import { chained } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** Where a unit faces after an action played an eighth off ahead: ahead, unless the action turned it. */
function settled(direction: Vector2, diagonal: Vector2, ahead: Vector2): Vector2 {
    return direction.equals(diagonal) ? ahead : direction
}

/** An action played twice, an eighth to the left of ahead then an eighth to the right, in one step. */
function doubled(inner: Action): Action {
    return {
        use: function* (ctx){
            const unit = ctx.unit
            const ahead = unit.direction
            for(const side of [-1, 1] as const){
                const diagonal = ahead.eighth(side)
                ctx.battle.turn(unit, diagonal)
                yield* inner.use(ctx)
                ctx.battle.turn(unit, settled(unit.direction, diagonal, ahead))
            }
        },
        preview: ctx => {
            const ahead = ctx.pose.direction
            const previews: Preview[] = []
            let pose = ctx.pose
            for(const side of [-1, 1] as const){
                const diagonal = ahead.eighth(side)
                const preview = inner.preview({ ...ctx, pose: { ...pose, direction: diagonal } })
                pose = { ...preview.pose, direction: settled(preview.pose.direction, diagonal, ahead) }
                previews.push({ ...preview, pose })
            }
            return chained(previews, ctx.pose)
        },
    }
}

export const DOUBLE_DIAGONAL = new ModifierCard(
    "Double diagonale", "L'action est jouée tournée de 45° à gauche puis à droite, en une étape.", Rarity.RARE,
    actions => actions.map(doubled),
)
