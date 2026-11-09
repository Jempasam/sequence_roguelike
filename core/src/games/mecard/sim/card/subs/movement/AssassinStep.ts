import type { Vector2 } from "../../../base/Vector2"
import type { Unit } from "../../../battle/Unit"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"

import { ActionCard } from "../ActionCard"
import { hold, wait, WORD_TIME } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** How far behind its target the assassin lands, from center to center, in meters: just off its back. */
const BEHIND_GAP = 0.05

/** How long the jump takes to fade out and back in, in seconds. */
const JUMP_TIME = 0.15

/** Where a unit would stab another from: its back, facing its way. */
export function backOf(unit: Unit, target: Unit): { at: Vector2, facing: Vector2 } {
    const at = target.position.minus(target.direction.times(unit.radius + target.radius + BEHIND_GAP))
    return { at, facing: target.direction }
}

/** Where the closest enemy from a pose would be stabbed from. */
function behind(battle: Battle, unit: Unit, pose: Pose): { at: Vector2, facing: Vector2 }|null {
    const target = battle.nearestEnemy(unit, Infinity, pose.position)
    return target && backOf(unit, target)
}

function stepping(): Action {
    return {
        use: function* ({ battle, unit }){
            const spot = behind(battle, unit, unit)
            if(!spot){
                battle.events.push({ type: "skipped", unit, reason: "personne en vue" })
                yield* hold(battle, WORD_TIME, [label(unit.position, "personne en vue", NOTE_COLOR)])
                return
            }
            yield* hold(battle, JUMP_TIME, [arrow([unit.position, spot.at], MOVE_WIDTH / 2, MOVE_COLOR)])
            if(battle.blink(unit, spot.at)) battle.turn(unit, spot.facing)
            yield* wait(JUMP_TIME)
        },
        preview: ({ battle, unit, pose }) => {
            const spot = behind(battle, unit, pose)
            if(!spot) return still(pose, label(pose.position, "personne en vue", NOTE_COLOR))
            if(!battle.free(spot.at, unit)) return still(pose, label(spot.at, "bloqué", NOTE_COLOR))
            const jump = arrow([pose.position, spot.at], MOVE_WIDTH / 2, MOVE_COLOR)
            return still({ position: spot.at, direction: spot.facing }, jump)
        },
    }
}

/** A jump into the back of the closest enemy in vision, facing its way. */
export const ASSASSIN_STEP = new ActionCard("Téléportation d'assassin", [
    "Se téléporte dans le dos de l'ennemi le plus proche, tourné comme lui.",
], Rarity.RARE, stepping())
