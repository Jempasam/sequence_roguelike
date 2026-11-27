import { DISTANCE, UNIT } from "../../../base/keywords"
import type { Action } from "../../../battle/Action"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { echoOf, isEcho } from "../../../process/subs/echo"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { ModifierCard } from "../ModifierCard"
import { hold, SHORT_TIME } from "../tools/playing"
import * as Previews from "../../../battle/preview/Previews"
import { TURN } from "../../../battle/mecanic/turn/keyword"
import * as Turn from "../../../battle/mecanic/turn"
import * as Steps from "../../../battle/mecanic/step"

/** How far around the unit the enemies copy its last action, in meters. */
const REFLECTION_RADIUS = 3 - UNIT_RADIUS

/** The last action a unit played before this one, none when it played none, copies left aside. */
function lastBefore(unit: Unit, self: Action): Action|null {
    for(let at = unit.stepsPlayed.length - 1; at >= 0; at--){
        const played = unit.stepsPlayed[at]
        if(played !== self && !isEcho(played)) return played
    }
    return null
}

/** Make every enemy near copy the last action of the unit, at its next step, where it stands. */
const reflecting: Action = {
    use: function ({ battle, unit }){
        const copied = lastBefore(unit, reflecting)
        if(!copied){
            hold(battle, SHORT_TIME, [Previews.label(unit.position, "rien à refléter", NOTE_COLOR)])
            return
        }
        const around = battle.enemiesOf(unit).filter(enemy => unit.hitbox.gap(unit, enemy.hitbox, enemy) <= REFLECTION_RADIUS)
        for(const enemy of around){
            Steps.insert(battle, enemy, [echoOf(copied)], { word: "reflet" })
        }
        hold(battle, SHORT_TIME, around.map(enemy => Previews.arrow([unit.position, enemy.position], MOVE_WIDTH / 2, MOVE_COLOR)))
    },
    preview: ({ battle, unit, pose }) => {
        const around = battle.enemiesOf(unit).filter(enemy => unit.hitbox.gap(pose, enemy.hitbox, enemy) <= REFLECTION_RADIUS)
        return Previews.still(pose, ...around.map(enemy => Previews.arrow([pose.position, enemy.position], MOVE_WIDTH / 2, MOVE_COLOR)))
    },
}

export const REFLECTION = new ActionCard("Reflet", [
    "Chaque ", UNIT, " ennemie à ", REFLECTION_RADIUS, " ", DISTANCE, " joue à son prochain pas ta dernière action, ",
    "de là où elle est.",
], Rarity.RARE, reflecting)

/**
 * An action whose first copy by another unit is played the wrong way round: the copier turns its back on the
 * way before playing it. Told again at each play of its owner, so it stays a round affair.
 */
function misdirected(action: Action): Action {
    let owner: Unit|null = null
    let spent = false
    const misdirection: Action = {
        use: ctx => {
            if(owner === null || ctx.unit === owner){
                owner = ctx.unit
                spent = false
            } else if(!spent){
                spent = true
                Turn.turn(ctx.battle, ctx.unit, ctx.unit.direction.opposite)
            }
            action.use(ctx)
        },
        preview: ctx => action.preview(ctx),
    }
    return misdirection
}

export const MISDIRECTION = new ModifierCard("Fausse route", [
    "Joue l'action. Le premier qui la copie la joue à l'envers : il ", TURN.as("tourne le dos"), " avant de la jouer.",
], Rarity.RARE, misdirected)
