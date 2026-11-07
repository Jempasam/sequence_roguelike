import type { Indicator, Pose } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import type { Battle } from "../../../battle/Battle"
import { HAZARD_COLOR, NOTE_COLOR, PHYSICAL_COLOR } from "../../../battle/previewColors"
import { meters, shotDamage } from "../../../battle/words"

import { ActionCard } from "../ActionCard"
import { hold, turn, WORD_TIME } from "../tools/playing"
import { label, polygon, still } from "../tools/previews"
import { fireShot, shotLine } from "../tools/volley"
import { SHOT_DAMAGE, SHOT_RANGE } from "./Shot"
import { Rarity } from "../../Rarity"

/** How many shots the machine gun of the catalog fires at most. */
const BURST = 10

/** How many shots a charged shot fires per this many actions its unit played before it. */
const CHARGE_EVERY = 2

function ringed(units: readonly Unit[]): Indicator[] {
    return units.map(hit => polygon({ kind: "circle", center: hit.position, radius: hit.radius }, HAZARD_COLOR))
}

/** The shots of a burst from a pose, each turning an eighth after the one before when it hit: line and target. */
function burst(battle: Battle, unit: Unit, pose: Pose): { line: Indicator, target: Unit|null }[] {
    const shots: { line: Indicator, target: Unit|null }[] = []
    let direction = pose.direction
    for(let count = 0; count < BURST; count++){
        const { area, target } = shotLine(battle, unit, { position: pose.position, direction })
        shots.push({ line: polygon(area, PHYSICAL_COLOR), target })
        if(!target) break
        direction = direction.eighth(1)
    }
    return shots
}

/** A shot that turns an eighth and shoots again after each hit. */
export const MACHINE_GUN = new ActionCard("Mitraillette", [
    "Tire comme Tir (", meters(SHOT_RANGE), " × portée, ", shotDamage(SHOT_DAMAGE), " + précision). Si le tir touche, ",
    "se tourne d'un huitième de tour et tire de nouveau, ", String(BURST), " tirs au plus.",
], Rarity.EPIC, {
    use: function* (ctx){
        const { battle, unit } = ctx
        for(let count = 0; count < BURST && unit.alive; count++){
            const hit = yield* fireShot(battle, unit)
            if(hit.length === 0) return
            yield* turn(ctx, unit.direction.eighth(1))
        }
    },
    preview: ({ battle, unit, pose }) => {
        const shots = burst(battle, unit, pose)
        return still(
            pose, ...shots.map(shot => shot.line),
            ...ringed(shots.flatMap(shot => shot.target ? [shot.target] : [])),
        )
    },
})

/** How many shots a charged shot fires: one, and one more for each pair of actions played before it. */
function charge(unit: Unit): number {
    // The step being played is in the list: it is not one played before it.
    return 1 + Math.floor(Math.max(0, unit.stepsPlayed.length - 1) / CHARGE_EVERY)
}

/** A shot repeated for the actions its unit played before it. */
export const CHARGED_SHOT = new ActionCard("Tir chargé", [
    "Tire comme Tir (", meters(SHOT_RANGE), " × portée, ", shotDamage(SHOT_DAMAGE), " + précision) une fois, plus une par ",
    String(CHARGE_EVERY), " actions jouées avant elle ce round.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        const times = charge(unit)
        for(let count = 0; count < times && unit.alive; count++){
            yield* fireShot(battle, unit)
            if(count < times - 1) yield* hold(battle, WORD_TIME / 4)
        }
    },
    preview: ({ battle, unit, pose }) => {
        const { area, end, target } = shotLine(battle, unit, pose)
        return still(
            pose, polygon(area, PHYSICAL_COLOR), label(end, `× ${charge(unit)}`, NOTE_COLOR),
            ...ringed(target ? [target] : []),
        )
    },
})
