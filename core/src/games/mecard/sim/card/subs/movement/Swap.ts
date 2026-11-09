import type { Vector2 } from "../../../base/Vector2"
import type { Unit } from "../../../battle/Unit"
import { CONTROL_COLOR, MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"

import { ActionCard } from "../ActionCard"
import { hold, wait, WORD_TIME } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { UNIT } from "../../../base/keywords"

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
        use: function* ({ battle, unit }){
            const other = closest(battle, unit, unit.position)
            if(!other){
                battle.events.push({ type: "skipped", unit, reason: "personne en vue" })
                yield* hold(battle, WORD_TIME, [label(unit.position, "personne en vue", NOTE_COLOR)])
                return
            }
            const jump = arrow([unit.position, other.position], MOVE_WIDTH / 2, MOVE_COLOR)
            yield* hold(battle, SWAP_TIME, [jump])
            battle.swap(unit, other)
            yield* wait(SWAP_TIME)
        },
        preview: ({ battle, unit, pose }) => {
            const other = closest(battle, unit, pose.position)
            if(!other) return still(pose, label(pose.position, "personne en vue", NOTE_COLOR))
            const there = arrow([pose.position, other.position], MOVE_WIDTH / 2, MOVE_COLOR)
            const back = arrow([other.position, pose.position], MOVE_WIDTH / 2, CONTROL_COLOR)
            return still({ ...pose, position: other.position }, there, back)
        },
    }
}

/** A swap of places with the closest unit in vision, ally or enemy. */
export const SWAP = new ActionCard("Échange", [
    "Échange ta place avec l'", UNIT, " la plus proche, alliée ou ennemie.",
], Rarity.RARE, swapping())
