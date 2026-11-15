import { CONTROL_COLOR, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import { DISTANCE, UNIT } from "../../../base/keywords"
import { STINKING, stenchRadius } from "../../../status/subs/Stench"

import { ActionCard } from "../ActionCard"
import { coneFrom } from "../tools/cone"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** How far the breath of the catalog reaches, in meters: a short cone. */
const BREATH_RANGE = 2.5

/** The cosine of half the angle of the cone of the breath: a cone of 60°. */
const BREATH_COS_HALF = Math.cos(Math.PI / 6)

/** How many rounds the stench of the breath lasts. */
const BREATH_ROUNDS = 2

/** A short cone in front: every unit in it, ally or enemy, begins to stink. */
function breathing(range: number, cosHalf: number, rounds: number): Action {
    return {
        use: function ({ battle, unit }){
            const cone = coneFrom(unit, range, cosHalf)
            const reached = battle.fetch(cone, unit)
            hold(battle, SHORT_TIME, [Previews.polygon(cone, CONTROL_COLOR)])
            for(const target of reached) battle.applyStatus(target, STINKING, rounds)
        },
        preview: ({ battle, unit, pose }) => {
            const cone = coneFrom(pose, range, cosHalf)
            const shown = battle.fetch(cone, unit).map(target => Previews.label(target.position, "puanteur", NOTE_COLOR))
            return Previews.still(pose, Previews.polygon(cone, CONTROL_COLOR), ...shown)
        },
    }
}

export const CARRION_BREATH = new ActionCard("Haleine de charogne", [
    "Chaque ", UNIT, " dans un cône court devant, jusqu'à ", BREATH_RANGE, " ", DISTANCE, ", alliée ou ennemie, gagne ",
    STINKING, " pendant ", BREATH_ROUNDS, " rounds : après chaque étape qu'elle joue, les unités à moins de ",
    stenchRadius(BREATH_ROUNDS), " ", DISTANCE, " d'elle sont repoussées.",
], Rarity.EPIC, breathing(BREATH_RANGE, BREATH_COS_HALF, BREATH_ROUNDS))
