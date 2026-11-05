import { INVOCATION } from "../../../base/keywords"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { Heart } from "../../../heart/Heart"
import { RED_HEART } from "../../../heart/subs/RedHeartKind"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** How many red hearts a clone lives by. */
const CLONE_HEARTS = 2

export const CLONE = new ActionCard(
    "Clone", [INVOCATION.as("Invoque"), " un clone, qui joue le reste de ta chaîne, puis disparaît."], Rarity.EPIC,
    {
        use: function* ({ battle, unit }){
            battle.clone(unit, Heart.many(RED_HEART, CLONE_HEARTS))
            yield* hold(battle, SHORT_TIME, [label(unit.position, "clone", NOTE_COLOR)])
        },
        preview: ({ pose }) => still(pose, label(pose.position, "clone", NOTE_COLOR)),
    },
)
