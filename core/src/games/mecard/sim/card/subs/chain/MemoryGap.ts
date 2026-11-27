import { CONTROL_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import { UNIT_RADIUS } from "../../../battle/Unit"
import { BATTLE_TURN, CARTE, DISTANCE, UNIT } from "../../../base/keywords"
import { DISABLE } from "../../../battle/mecanic/step/keyword"
import * as Steps from "../../../battle/mecanic/step"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** How far the memory gap of the catalog reaches ahead, in meters. */
const GAP_RANGE = 4 - UNIT_RADIUS

/** How many of its next trees the unit hit forgets: its next turn. */
const GAP_TREES = 1

/** What a gap finding nobody says. */
const NOBODY = "personne en face"

/** The first unit ahead forgets what it was to play next: its next tree is dropped from its chain, unplayed. */
function forgetting(range: number, trees: number): Action {
    return {
        use: function ({ battle, unit }){
            const { unit: target } = battle.ray(unit, range)
            if(!target){
                battle.events.push({ type: "skipped", unit, reason: NOBODY })
                hold(battle, SHORT_TIME, [Previews.label(unit.position, NOBODY, NOTE_COLOR)])
                return
            }
            hold(battle, SHORT_TIME, [Previews.arrow([unit.position, target.position], MOVE_WIDTH, CONTROL_COLOR)])
            Steps.disable(battle, target, trees, "trou de mémoire")
        },
        preview: ({ battle, unit, pose }) => {
            const { unit: target } = battle.ray(unit, range, pose)
            if(!target) return Previews.still(pose, Previews.label(pose.position, NOBODY, NOTE_COLOR))
            return Previews.still(
                pose, Previews.arrow([pose.position, target.position], MOVE_WIDTH, CONTROL_COLOR),
                Previews.label(target.position, "oublie son prochain tour", NOTE_COLOR),
            )
        },
    }
}

export const MEMORY_GAP = new ActionCard("Trou de mémoire", [
    "L'", UNIT, " en face, jusqu'à ", GAP_RANGE, " ", DISTANCE, ", oublie sa prochaine ", BATTLE_TURN.as("étape"), " : ses ",
    CARTE.as("cartes"), " sont ", DISABLE.as("grisées"), ", elle ne la jouera pas.",
], Rarity.RARE, forgetting(GAP_RANGE, GAP_TREES))
