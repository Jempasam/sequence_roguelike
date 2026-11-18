import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import { UNIT_RADIUS } from "../../../battle/Unit"
import { DISTANCE, UNIT } from "../../../base/keywords"
import { Mimicking } from "../../../process/subs/Mimicking"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** How far the nerf of the catalog flies ahead, in meters. */
const NERF_RANGE = 6 - UNIT_RADIUS

/** What a nerf finding nobody says. */
const NOBODY = "personne en face"

/** A nerf shot straight ahead: it sticks to the first unit it meets, which then copies the shooter's actions. */
function shooting(range: number): Action {
    return {
        use: function ({ battle, unit }){
            const { unit: target } = battle.ray(unit, range)
            if(!target){
                battle.events.push({ type: "skipped", unit, reason: NOBODY })
                hold(battle, SHORT_TIME, [Previews.label(unit.position, NOBODY, NOTE_COLOR)])
                return
            }
            battle.startProcess(unit, new Mimicking(target))
            hold(battle, SHORT_TIME, [Previews.arrow([unit.position, target.position], MOVE_WIDTH, CONTROL_COLOR)])
        },
        preview: ({ battle, unit, pose }) => {
            const { unit: target } = battle.ray(unit, range, pose)
            if(!target) return Previews.still(pose, Previews.label(pose.position, NOBODY, NOTE_COLOR))
            return Previews.still(
                pose, Previews.arrow([pose.position, target.position], MOVE_WIDTH, CONTROL_COLOR),
                Previews.label(target.position, "exo-nerf", NOTE_COLOR),
            )
        },
    }
}

export const EXO_NERF = new ActionCard("Exo-nerf", [
    "Lance un nerf droit devant, jusqu'à ", NERF_RANGE, " ", DISTANCE, " : il s'accroche à la première ", UNIT,
    " touchée. Jusqu'à la fin du round, chaque action que tu joues, elle la joue aussi, à son prochain pas.",
], Rarity.RARE, shooting(NERF_RANGE))
