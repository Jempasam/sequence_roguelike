import { UNIT, BATTLE_TURN } from "../../../base/keywords"
import { INFLICTED } from "../../../battle/mecanic/inflict/keyword"
import * as Inflict from "../../../battle/mecanic/inflict"
import type { Action, UnitContext } from "../../../battle/Action"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { Rarity } from "../../Rarity"

import { ModifierCard } from "../ModifierCard"
import * as Previews from "../../../battle/preview/Previews"
/** How many times a combo plays its action at most, the first included. */
const COMBO_MAX = 4

/** Play an action: was an enemy hurt meanwhile? */
function landing(action: Action, ctx: UnitContext): boolean {
    const wounds = Inflict.collectFrom(ctx, action, ctx.battle.signals.damaged,
        ({ unit, amount }) => amount > 0 && unit.team !== ctx.unit.team)
    return wounds.length > 0
}

/** An action played again as long as it inflicts damage on an enemy, up to a number of times, as one step. */
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
    "Joue l'action ; tant qu'elle ", INFLICTED.as("inflige"), " des dégâts à une ", UNIT, " ennemie, la rejoue, ",
    "jusqu'à ", COMBO_MAX, " fois en tout, en une seule ", BATTLE_TURN.as("étape"), ".",
], Rarity.EPIC, combo)
