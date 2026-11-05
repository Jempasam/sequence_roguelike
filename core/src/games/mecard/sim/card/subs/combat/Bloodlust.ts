import { NOTE_COLOR } from "../../../battle/previewColors"
import { counted, meters } from "../../../battle/words"
import { Bloodlust, BLOODLUST_STRIDE } from "../../../status/subs/Bloodlust"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** How many rounds the bloodlust of the catalog lasts. */
const BLOODLUST_ROUNDS = 3

/** A lasting thirst, driving each step closer to the frailest enemy a stride further. */
export const BLOODLUST_CARD = new ActionCard("Soif de sang", [
    "Pendant ", counted(BLOODLUST_ROUNDS, "round"), ", chaque étape qui te rapproche de l'ennemi qui a le moins de vie ",
    "t'emporte de ", meters(BLOODLUST_STRIDE), " de plus devant toi.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        battle.applyStatus(unit, new Bloodlust(BLOODLUST_ROUNDS))
        yield* hold(battle, SHORT_TIME, [label(unit.position, "soif de sang", NOTE_COLOR)])
    },
    preview: ({ pose }) => still(pose, label(pose.position, "soif de sang", NOTE_COLOR)),
})
