import { NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import { DISTANCE, UNIT } from "../../../base/keywords"

import { ActionCard } from "../ActionCard"
import { aimedCone, closestInCone, LONG_CONE_RANGE, NARROW_COS_HALF } from "../tools/cone"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** What a stutter finding nobody says. */
const NOBODY = "personne à faire bégayer"

/** What a stutter finding a unit with nothing played says. */
const NOTHING = "rien à répéter"

/** A long narrow cone: the closest unit in it plays again the last cards it played, right after what it has ready. */
function stuttering(range: number, cosHalf: number): Action {
    return {
        use: function ({ battle, unit }){
            const target = closestInCone(battle, unit, unit, range, cosHalf)
            if(!target) battle.events.push({ type: "skipped", unit, reason: NOBODY })
            hold(battle, SHORT_TIME, aimedCone(unit, unit, range, cosHalf, target, NOBODY))
            if(target && !battle.repeatLast(target)) battle.events.push({ type: "skipped", unit, reason: NOTHING })
        },
        preview: ({ battle, unit, pose }) => {
            const target = closestInCone(battle, unit, pose, range, cosHalf)
            const shown = aimedCone(unit, pose, range, cosHalf, target, NOBODY)
            if(!target) return Previews.still(pose, ...shown)
            const word = target.lastTree.length > 0 ? "bégaie" : NOTHING
            return Previews.still(pose, ...shown, Previews.label(target.position, word, NOTE_COLOR))
        },
    }
}

/** How far the stutter of the catalog reaches, in meters. */
const STUTTER_RANGE = LONG_CONE_RANGE

export const STUTTER = new ActionCard("Bégaiement", [
    "L'", UNIT, " la plus proche dans un cône étroit et long devant, jusqu'à ", STUTTER_RANGE, " ", DISTANCE,
    ", rejoue les dernières cartes qu'elle a jouées, juste après ce qu'elle a déjà prévu.",
], Rarity.RARE, stuttering(STUTTER_RANGE, NARROW_COS_HALF))
