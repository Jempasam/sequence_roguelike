import type { Action } from "../../../battle/Action"
import type { Preview } from "../../../battle/preview/Preview"
import { ModifierCard } from "../ModifierCard"
import { turn } from "../tools/playing"
import { inOrder } from "../tools/sequence"
import { Rarity } from "../../Rarity"

/** How many times a tornado plays its action, a quarter turn to the right after each time. */
const TORNADO_TURNS = 4

/** An action, then a quarter turn to the right, in one step. */
function thenTurned(inner: Action): Action {
    return {
        use: ctx => {
            inner.use(ctx)
            turn(ctx, ctx.unit.direction.right)
        },
        preview: (ctx): Preview => {
            const preview = inner.preview(ctx)
            return { ...preview, pose: { ...preview.pose, direction: preview.pose.direction.right } }
        },
    }
}

/**
 * The action played four times, each time a quarter turn to the right of the one before, in one step: the
 * unit ends facing as it started. Nested, it spins what it holds: a double diagonal goes all eight ways.
 */
export const TORNADO = new ModifierCard(
    "Tornade",
    "L'action est jouée 4 fois, un quart de tour à droite après chacune, en une seule étape.",
    Rarity.EPIC,
    action => inOrder(Array.from({ length: TORNADO_TURNS }, () => thenTurned(action))),
)
