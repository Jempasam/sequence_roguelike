import { HEART, UNIT } from "../../../base/keywords"
import type { Action, ActionRun, UnitContext } from "../../../battle/Action"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { Rarity } from "../../Rarity"

import { ModifierCard } from "../ModifierCard"
import { label, still } from "../tools/previews"

/** How many times a combo plays its actions at most, the first included. */
const COMBO_MAX = 4

/** Play actions one after the other: did an enemy lose a heart to the unit meanwhile? */
function* landing(actions: readonly Action[], ctx: UnitContext): Generator<void, boolean, void> {
    let landed = false
    const { unit } = ctx
    const listening = unit.hitting.add(({ target, amount }) => {
        if(amount > 0 && target.team !== unit.team) landed = true
    })
    try {
        for(const action of actions) yield* action.use(ctx)
    } finally {
        listening.remove()
    }
    return landed
}

/** Actions played again as long as they take a heart from an enemy, up to a number of times, as one step. */
function combo(actions: readonly Action[]): Action {
    return {
        use: function* (ctx): ActionRun {
            for(let played = 0; played < COMBO_MAX && ctx.unit.alive; played++){
                if(!(yield* landing(actions, ctx))) return
            }
        },
        preview: ctx => {
            let pose = ctx.pose
            const indicators = actions.flatMap(action => {
                const shown = action.preview({ ...ctx, pose })
                pose = shown.pose
                return shown.indicators
            })
            return still(pose, ...indicators, label(ctx.pose.position, `jusqu'à × ${COMBO_MAX}`, NOTE_COLOR))
        },
    }
}

export const COMBO = new ModifierCard("Combo", [
    "Joue l'action ; tant qu'une ", UNIT, " ennemie y perd au moins un ", HEART, ", la rejoue, jusqu'à ", COMBO_MAX,
    " fois en tout, en une seule étape.",
], Rarity.EPIC, actions => [combo(actions)])
