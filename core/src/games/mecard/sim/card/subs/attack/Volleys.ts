import type { Pose } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Unit } from "../../../battle/Unit"
import type { Battle } from "../../../battle/Battle"
import { MOVE_WIDTH, NOTE_COLOR, POTENTIAL_COLOR } from "../../../battle/previewColors"
import { DISTANCE, PORTEE, PRECISION, BATTLE_ROUND } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"

import { ActionCard } from "../ActionCard"
import { hold, WORD_TIME } from "../tools/playing"
import { TURN } from "../../../battle/mecanic/turn/keyword"
import * as Turn from "../../../battle/mecanic/turn"
import { fireShot, shotLine } from "../tools/volley"
import { ARROW_LOOK, BULLET_LOOK } from "../tools/blowLooks"
import { SHOT_DAMAGE, SHOT_RANGE } from "./Shot"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"
import * as Areas from "../../../battle/area/Areas"

/** How many shots the machine gun of the catalog fires at most. */
const BURST = 10

/** How many directions a unit turning an eighth at a time goes through before facing the first again. */
const DIRECTIONS = 8

/** How many shots a charged shot fires per this many actions its unit played before it. */
const CHARGE_EVERY = 2

/** The shots of a burst from a pose, each turning an eighth after the one before when it hit, as previewed. */
function burst(battle: Battle, unit: Unit, pose: Pose): Indicator[] {
    const shots: Indicator[] = []
    let direction = pose.direction
    for(let count = 0; count < BURST; count++){
        const { area, target } = shotLine(battle, unit, { position: pose.position, direction })
        shots.push(...Previews.strike([area], target ? [target] : []))
        if(!target) break
        direction = direction.eighth(1)
    }
    return shots
}

/** A grey line for each shot a burst from a pose may fire, as far as the first body or wall on its way. */
function aims(battle: Battle, unit: Unit, pose: Pose): Indicator[] {
    const lines: Indicator[] = []
    let direction = pose.direction
    for(let count = 0; count < DIRECTIONS; count++){
        const { start, end } = shotLine(battle, unit, { position: pose.position, direction })
        lines.push(Previews.polygon(Areas.line(start, end, MOVE_WIDTH / 2), POTENTIAL_COLOR))
        direction = direction.eighth(1)
    }
    return lines
}

/** A shot that turns an eighth and shoots again after each hit. */
export const MACHINE_GUN = new ActionCard("Mitraillette", [
    "Tire comme Tir (", SHOT_RANGE, "×", PORTEE, " ", DISTANCE, ", ", SHOT_DAMAGE, "+", PRECISION, " ",
    DamageType.PHYSICAL, "). Si le tir touche, ", TURN.as("se tourne"), " d'un huitième de tour et tire de nouveau, ", BURST,
    " tirs au plus.",
], Rarity.EPIC, {
    use: function (ctx){
        const { battle, unit } = ctx
        for(let count = 0; count < BURST && unit.alive; count++){
            const hit = fireShot(battle, unit, BULLET_LOOK)
            if(hit.length === 0) return
            Turn.turnToward(ctx, unit.direction.eighth(1))
        }
    },
    preview: ({ battle, unit, pose }) => {
        return Previews.still(pose, ...burst(battle, unit, pose), ...aims(battle, unit, pose))
    },
})

/** How many shots a charged shot fires: one, and one more for each pair of actions played before it. */
function charge(unit: Unit): number {
    // The step being played is in the list: it is not one played before it.
    return 1 + Math.floor(Math.max(0, unit.stepsPlayed.length - 1) / CHARGE_EVERY)
}

/** A shot repeated for the actions its unit played before it. */
export const CHARGED_SHOT = new ActionCard("Tir chargé", [
    "Tire comme Tir (", SHOT_RANGE, "×", PORTEE, " ", DISTANCE, ", ", SHOT_DAMAGE, "+", PRECISION, " ",
    DamageType.PHYSICAL, ") une fois, plus une par ", CHARGE_EVERY, " actions jouées avant elle ce ", BATTLE_ROUND, ".",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        const times = charge(unit)
        for(let count = 0; count < times && unit.alive; count++){
            fireShot(battle, unit, ARROW_LOOK)
            if(count < times - 1) hold(battle, WORD_TIME / 4)
        }
    },
    preview: ({ battle, unit, pose }) => {
        const { area, end, target } = shotLine(battle, unit, pose)
        return Previews.still(
            pose, ...Previews.strike([area], target ? [target] : []), Previews.label(end, `× ${charge(unit)}`, NOTE_COLOR),
        )
    },
})
