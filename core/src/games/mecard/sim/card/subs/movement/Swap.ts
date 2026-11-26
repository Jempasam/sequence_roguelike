import type { Vector2 } from "../../../base/Vector2"
import type { Unit } from "../../../battle/Unit"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"

import { ActionCard } from "../ActionCard"
import { hold, wait, WORD_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { UNIT } from "../../../base/keywords"
import * as Previews from "../../../battle/preview/Previews"
import { SWAPPING } from "../../../battle/mecanic/swap/keyword"
import * as Swap from "../../../battle/mecanic/swap"

/** How long a swap takes to fade out and back in, in seconds. */
const SWAP_TIME = 0.15

/** The closest other unit from a point, ally or enemy, none for none. */
function closest(battle: Battle, unit: Unit, from: Vector2): Unit|null {
    let found: Unit|null = null
    let best = Infinity
    for(const other of battle.living){
        const distance = other.position.distance(from)
        if(other !== unit && distance <= best){
            found = other
            best = distance
        }
    }
    return found
}

function swapping(): Action {
    return {
        use: function ({ battle, unit }){
            const other = closest(battle, unit, unit.position)
            if(!other){
                battle.events.push({ type: "skipped", unit, reason: "personne en vue" })
                hold(battle, WORD_TIME, [Previews.label(unit.position, "personne en vue", NOTE_COLOR)])
                return
            }
            const jump = Previews.arrow([unit.position, other.position], MOVE_WIDTH / 2, MOVE_COLOR)
            hold(battle, SWAP_TIME, [jump])
            Swap.swap(battle, unit, other)
            wait(battle, SWAP_TIME)
        },
        preview: ({ battle, unit, pose }) => {
            const other = closest(battle, unit, pose.position)
            if(!other) return Previews.still(pose, Previews.label(pose.position, "personne en vue", NOTE_COLOR))
            return Swap.swapShown(unit, pose, other)
        },
    }
}

/** A swap of places with the closest unit in vision, ally or enemy. */
export const SWAP = new ActionCard("Échange", [
    SWAPPING.as("Échange ta place"), " avec l'", UNIT, " la plus proche, alliée ou ennemie.",
], Rarity.RARE, swapping())
