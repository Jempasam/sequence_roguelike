import { INVOCATION } from "../../../base/keywords"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { Heart } from "../../../heart/Heart"
import { RED_HEART } from "../../../heart/subs/RedHeartKind"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** How many red hearts a clone lives by. */
const CLONE_HEARTS = 2

export const CLONE = new ActionCard(
    "Clone", [INVOCATION.as("Invoque"), " un clone, qui joue le reste de ta chaîne, puis disparaît."], Rarity.EPIC,
    {
        use: function ({ battle, unit }){
            battle.cloneUnit(unit, Heart.many(RED_HEART, CLONE_HEARTS))
            hold(battle, SHORT_TIME, [Previews.label(unit.position, "clone", NOTE_COLOR)])
        },
        preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, "clone", NOTE_COLOR)),
    },
)
