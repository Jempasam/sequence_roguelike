import { NOTE_COLOR } from "../../../battle/previewColors"
import type { StatusType } from "../../../status/Status"
import { COUNTER, DISARM, DODGE, SLIDING_PARRY, WOODEN_SHIELD } from "../../../status/subs/Dodge"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** A card putting a guard on its unit, at a level: a dodge, a counter... */
function guardCard(name: string, type: StatusType, level: number, rarity: Rarity): ActionCard {
    return new ActionCard(name, ["Prend ", type.make(level, type), "."], rarity, {
        use: function* ({ battle, unit }){
            battle.applyStatus(unit, type, level)
            yield* hold(battle, SHORT_TIME, [label(unit.position, type.name, NOTE_COLOR)])
        },
        preview: ({ pose }) => still(pose, label(pose.position, type.name, NOTE_COLOR)),
    })
}

export const DODGE_CARD = guardCard("Esquive", DODGE, 1, Rarity.COMMON)

export const COUNTER_CARD = guardCard("Contre", COUNTER, 1, Rarity.RARE)

export const WOODEN_SHIELD_CARD = guardCard("Bouclier en bois", WOODEN_SHIELD, 1, Rarity.COMMON)

export const SLIDING_PARRY_CARD = guardCard("Parade glissante", SLIDING_PARRY, 1, Rarity.RARE)

export const DISARM_CARD = guardCard("Désarmement", DISARM, 1, Rarity.RARE)
