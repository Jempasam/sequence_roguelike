import { NOTE_COLOR } from "../../../battle/previewColors"
import { Dodge } from "../../../status/subs/Dodge"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

export const DODGE_CARD = new ActionCard("Esquive", [
    "Prend ", new Dodge(), " : ignore les dégâts physiques jusqu'à la fin du round.",
], Rarity.COMMON, {
    use: function* ({ battle, unit }){
        battle.applyStatus(unit, new Dodge())
        yield* hold(battle, SHORT_TIME, [label(unit.position, "esquive", NOTE_COLOR)])
    },
    preview: ({ pose }) => still(pose, label(pose.position, "esquive", NOTE_COLOR)),
})
