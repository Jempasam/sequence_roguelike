import type { Action, Preview } from "../../../battle/Action"

import { ModifierCard } from "../ModifierCard"
import { turn } from "../tools/playing"
import { Rarity } from "../../Rarity"

/** How many times a tornado plays its actions, a quarter turn to the right after each time. */
const TORNADO_TURNS = 4

/** An action, then a quarter turn to the right, in one step. */
function thenTurned(inner: Action): Action {
    return {
        use: function* (ctx){
            yield* inner.use(ctx)
            yield* turn(ctx, ctx.unit.direction.right)
        },
        preview: (ctx): Preview => {
            const preview = inner.preview(ctx)
            return { ...preview, pose: { ...preview.pose, direction: preview.pose.direction.right } }
        },
    }
}

/**
 * The actions played four times, each time a quarter turn to the right of the one before, a step each: the
 * unit ends facing as it started. Nested, it spins what it holds: a double diagonal goes all eight ways.
 */
export const TORNADO = new ModifierCard(
    "Tornade",
    "L'action est jouée 4 fois, un quart de tour à droite après chacune, une étape chaque fois.",
    Rarity.EPIC,
    actions => {
        const spun: Action[] = []
        for(let i = 0; i < TORNADO_TURNS; i++){
            spun.push(...actions.slice(0, -1), ...actions.slice(-1).map(thenTurned))
        }
        return spun
    },
)
