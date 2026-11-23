import { NOTE_COLOR } from "../../../battle/previewColors"

import { ActionCard } from "../ActionCard"
import { hold, WORD_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"
import { BATTLE_TURN } from "../../../base/keywords"

/** Nothing, for a moment: the timing of a chain. */
export const WAIT = new ActionCard("Attendre", ["Ne fait rien pendant une ", BATTLE_TURN.as("étape"), "."], Rarity.COMMON, {
    use: function ({ battle, unit }){
        battle.events.push({ type: "skipped", unit, reason: "attend" })
        hold(battle, WORD_TIME, [Previews.label(unit.position, "attend", NOTE_COLOR)])
    },
    preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, "attend", NOTE_COLOR)),
})
