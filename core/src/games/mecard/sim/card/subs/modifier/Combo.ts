import { HEART, UNIT, BATTLE_TURN } from "../../../base/keywords"
import type { Action, UnitContext } from "../../../battle/Action"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { Rarity } from "../../Rarity"

import { ModifierCard } from "../ModifierCard"
import * as Previews from "../../../battle/preview/Previews"
/** How many times a combo plays its action at most, the first included. */
const COMBO_MAX = 4

/** Play an action: did an enemy lose a heart to the unit meanwhile? */
function landing(action: Action, ctx: UnitContext): boolean {
    let landed = false
    const { unit } = ctx
    const listening = unit.hitting.add(({ target, amount }) => {
        if(amount > 0 && target.team !== unit.team) landed = true
    })
    try {
        action.use(ctx)
    } finally {
        listening.remove()
    }
    return landed
}

/** An action played again as long as it takes a heart from an enemy, up to a number of times, as one step. */
function combo(action: Action): Action {
    return {
        use: ctx => {
            for(let played = 0; played < COMBO_MAX && ctx.unit.alive; played++){
                if(!landing(action, ctx)) return
            }
        },
        preview: ctx => {
            const shown = action.preview(ctx)
            return Previews.still(shown.pose, ...shown.indicators, Previews.label(ctx.pose.position, `jusqu'à × ${COMBO_MAX}`, NOTE_COLOR))
        },
    }
}

export const COMBO = new ModifierCard("Combo", [
    "Joue l'action ; tant qu'une ", UNIT, " ennemie y perd au moins un ", HEART, ", la rejoue, jusqu'à ", COMBO_MAX,
    " fois en tout, en une seule ", BATTLE_TURN.as("étape"), ".",
], Rarity.EPIC, combo)
