import { NOTE_COLOR } from "../../../battle/previewColors"
import { counted } from "../../../battle/words"
import { OVERHEATED, OVERHEAT_BONUS, OVERHEAT_KILL_ROUNDS } from "../../../status/subs/Overheat"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"
import { BATTLE_ROUND } from "../../../base/keywords"

/** How many rounds the overheat of the catalog lasts. */
const OVERHEAT_ROUNDS = 3

/** Burn the unit up for a few rounds: stronger and quicker in everything, and dead when it ends unless it kills. */
export const OVERHEAT_CARD = new ActionCard("Surchauffe", [
    "Pendant ", counted(OVERHEAT_ROUNDS, "round"), " : +", OVERHEAT_BONUS, " force, précision, mouvement, chaîne max et ",
    "pioche. Chaque unité tuée donne ", OVERHEAT_KILL_ROUNDS, " ", BATTLE_ROUND, " de plus. À la fin, tu meurs.",
], Rarity.LEGENDARY, {
    use: function ({ battle, unit }){
        battle.applyStatus(unit, OVERHEATED, OVERHEAT_ROUNDS)
        hold(battle, SHORT_TIME, [Previews.label(unit.position, "surchauffe", NOTE_COLOR)])
    },
    preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, "surchauffe", NOTE_COLOR)),
})
