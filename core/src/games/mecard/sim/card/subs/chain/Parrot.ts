import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import { UNIT_RADIUS } from "../../../battle/Unit"
import { DISTANCE, UNIT } from "../../../base/keywords"
import { Parroting } from "../../../process/subs/Parroting"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** How far the parrot of the catalog reaches ahead, in meters. */
const PARROT_RANGE = 6 - UNIT_RADIUS

/** What a parrot finding nobody says. */
const NOBODY = "personne en face"

/** The first unit ahead is echoed: its next action is played by the caster too, from where it stands. */
function echoing(range: number): Action {
    return {
        use: function ({ battle, unit }){
            const { unit: target } = battle.ray(unit, range)
            if(!target){
                battle.events.push({ type: "skipped", unit, reason: NOBODY })
                hold(battle, SHORT_TIME, [Previews.label(unit.position, NOBODY, NOTE_COLOR)])
                return
            }
            battle.startProcess(unit, new Parroting(target))
            hold(battle, SHORT_TIME, [Previews.arrow([unit.position, target.position], MOVE_WIDTH, CONTROL_COLOR)])
        },
        preview: ({ battle, unit, pose }) => {
            const { unit: target } = battle.ray(unit, range, pose)
            if(!target) return Previews.still(pose, Previews.label(pose.position, NOBODY, NOTE_COLOR))
            return Previews.still(
                pose, Previews.arrow([pose.position, target.position], MOVE_WIDTH, CONTROL_COLOR),
                Previews.label(target.position, "imité", NOTE_COLOR),
            )
        },
    }
}

export const PARROT = new ActionCard("Perroquet", [
    "La prochaine action de l'", UNIT, " en face, jusqu'à ", PARROT_RANGE, " ", DISTANCE,
    ", tu la joues aussi, à ton prochain pas, de là où tu es.",
], Rarity.RARE, echoing(PARROT_RANGE))
