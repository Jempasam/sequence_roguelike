import { INVOCATION } from "../../../battle/mecanic/summon/keyword"
import * as Summons from "../../../battle/mecanic/summon"
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
        preview: ({ battle, unit, pose }) => {
            const spot = battle.cloneSpot(unit, pose)
            return Previews.still(pose, ...spot ? [Summons.summonShown(spot)] : [Previews.label(pose.position, "pas de place", NOTE_COLOR)])
        },
    },
)
