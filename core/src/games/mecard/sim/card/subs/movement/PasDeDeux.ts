import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR, CONTROL_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import { DISTANCE, UNIT } from "../../../base/keywords"

import { ActionCard } from "../ActionCard"
import { aimedCone, closestInCone, LONG_CONE_RANGE, NARROW_COS_HALF } from "../tools/cone"
import { hold, SHORT_TIME, wait } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** How long the dancers take to cross, in seconds. */
const DANCE_TIME = 0.15

/** What a pas de deux finding nobody says. */
const NOBODY = "personne avec qui danser"

/** How far the pas de deux of the catalog reaches, in meters. */
const PAS_DE_DEUX_RANGE = LONG_CONE_RANGE

/** A long narrow cone: the closest unit in it, ally or enemy, and the caster trade places and facings. */
function dancing(range: number, cosHalf: number): Action {
    return {
        use: function ({ battle, unit }){
            const partner = closestInCone(battle, unit, unit, range, cosHalf)
            if(!partner){
                battle.events.push({ type: "skipped", unit, reason: NOBODY })
                hold(battle, SHORT_TIME, aimedCone(unit, unit, range, cosHalf, null, NOBODY))
                return
            }
            const crossing = [
                Previews.arrow([unit.position, partner.position], MOVE_WIDTH / 2, MOVE_COLOR),
                Previews.arrow([partner.position, unit.position], MOVE_WIDTH / 2, CONTROL_COLOR),
            ]
            hold(battle, DANCE_TIME, [...aimedCone(unit, unit, range, cosHalf, partner, NOBODY), ...crossing])
            const mine = unit.direction
            const theirs = partner.direction
            if(!battle.swap(unit, partner)) return
            battle.unblock(unit)
            battle.unblock(partner)
            battle.turn(unit, theirs)
            battle.turn(partner, mine)
            wait(battle, DANCE_TIME)
        },
        preview: ({ battle, unit, pose }) => {
            const partner = closestInCone(battle, unit, pose, range, cosHalf)
            const shown = aimedCone(unit, pose, range, cosHalf, partner, NOBODY)
            if(!partner) return Previews.still(pose, ...shown)
            return Previews.still(
                { position: partner.position, direction: partner.direction }, ...shown,
                Previews.arrow([pose.position, partner.position], MOVE_WIDTH / 2, MOVE_COLOR),
                Previews.arrow([partner.position, pose.position], MOVE_WIDTH / 2, CONTROL_COLOR),
                Previews.label(pose.position, "échange", NOTE_COLOR),
            )
        },
    }
}

export const PAS_DE_DEUX = new ActionCard("Pas de deux", [
    "Échange ta place et ton orientation avec l'", UNIT, " la plus proche, alliée ou ennemie, dans un cône étroit ",
    "et long devant, jusqu'à ", PAS_DE_DEUX_RANGE, " ", DISTANCE, ".",
], Rarity.RARE, dancing(PAS_DE_DEUX_RANGE, NARROW_COS_HALF))
