import { NOTE_COLOR } from "../../../battle/previewColors"

import { ActionCard } from "../ActionCard"
import { hold, WORD_TIME } from "../tools/playing"
import { label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** Nothing, for a moment: the timing of a chain. */
export const WAIT = new ActionCard("Attendre", "Ne fait rien pendant une étape.", Rarity.COMMON, {
    use: function* ({ battle, unit }){
        battle.events.push({ type: "skipped", unit, reason: "attend" })
        yield* hold(battle, WORD_TIME, [label(unit.position, "attend", NOTE_COLOR)])
    },
    preview: ({ pose }) => still(pose, label(pose.position, "attend", NOTE_COLOR)),
})
