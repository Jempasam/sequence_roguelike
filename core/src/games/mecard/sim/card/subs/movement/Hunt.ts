import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { frailest } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import type { Battle } from "../../../battle/Battle"

import { ActionCard } from "../ActionCard"
import { hold, wait, WORD_TIME } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { backOf } from "./AssassinStep"

/** What the hunt says when no enemy is feverish. */
const NOBODY = "personne de fébrile"

/** How long the jump takes to leave and to land, in seconds. */
const JUMP_TIME = 0.15

/** The feverish enemy of a unit with the least life, none when none is feverish. */
function prey(battle: Battle, unit: Unit): Unit|null {
    return frailest(battle.enemiesOf(unit).filter(enemy => enemy.feverish))
}

/** A jump into the back of the frailest feverish enemy, however far: nobody feverish, nothing happens. */
export const HUNT = new ActionCard("Traque", [
    "Se téléporte dans le dos de l'ennemi fébrile (plus de cœurs vides que pleins) qui a le moins de vie, ",
    "à n'importe quelle distance, tourné comme lui. Aucun fébrile : raté.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        const target = prey(battle, unit)
        if(!target){
            battle.events.push({ type: "skipped", unit, reason: NOBODY })
            yield* hold(battle, WORD_TIME, [label(unit.position, NOBODY, NOTE_COLOR)])
            return
        }
        const { at, facing } = backOf(unit, target)
        yield* hold(battle, JUMP_TIME, [arrow([unit.position, at], MOVE_WIDTH / 2, MOVE_COLOR)])
        if(battle.leap(unit, at)){
            battle.turn(unit, facing)
            battle.unblock(unit)
        }
        yield* wait(JUMP_TIME)
    },
    preview: ({ battle, unit, pose }) => {
        const target = prey(battle, unit)
        if(!target) return still(pose, label(pose.position, NOBODY, NOTE_COLOR))
        const { at, facing } = backOf(unit, target)
        const jump = arrow([pose.position, at], MOVE_WIDTH / 2, MOVE_COLOR)
        return still({ position: at, direction: facing }, jump)
    },
})
