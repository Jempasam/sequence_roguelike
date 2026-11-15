import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { frailest } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import type { Battle } from "../../../battle/Battle"

import { ActionCard } from "../ActionCard"
import { hold, wait, WORD_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { FEBRILE } from "../../../base/keywords"
import { backOf } from "./AssassinStep"
import * as Previews from "../../../battle/preview/Previews"

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
    "Se téléporte dans le dos de l'ennemi ", FEBRILE, " qui a le moins de vie, ",
    "à n'importe quelle distance, tourné comme lui. Aucun ", FEBRILE, " : raté.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        const target = prey(battle, unit)
        if(!target){
            battle.events.push({ type: "skipped", unit, reason: NOBODY })
            hold(battle, WORD_TIME, [Previews.label(unit.position, NOBODY, NOTE_COLOR)])
            return
        }
        const { at, facing } = backOf(unit, target)
        hold(battle, JUMP_TIME, [Previews.arrow([unit.position, at], MOVE_WIDTH / 2, MOVE_COLOR)])
        if(battle.leap(unit, at)){
            battle.turn(unit, facing)
            battle.unblock(unit)
        }
        wait(battle, JUMP_TIME)
    },
    preview: ({ battle, unit, pose }) => {
        const target = prey(battle, unit)
        if(!target) return Previews.still(pose, Previews.label(pose.position, NOBODY, NOTE_COLOR))
        const { at, facing } = backOf(unit, target)
        return Previews.still({ position: at, direction: facing }, ...Previews.moving(unit, pose.position, at, at, MOVE_WIDTH / 2))
    },
})
