import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import { BLEEDING } from "../../../status/subs/Wounds"

import { AbstractItem } from "../AbstractItem"

/** The cosine of the angle, 30°, within which a move is taken to go towards a bleeding unit. */
const TOWARDS_COS = Math.cos(30 * Math.PI / 180)

/** How far, in meters and times the agility, the trail carries a unit on. */
const TRAIL_LENGTH = 1

/** A blood trail: a move towards a bleeding unit goes on as far as the move itself, once. */
export class BloodTrail extends AbstractItem {


    constructor(){
        super("Piste de sang", visual("items/blood_trail"), [
            "Quand tu te déplaces vers une unité qui saigne, tu avances d'autant de plus (1×agilité).",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        let following = false
        hold(unit.moved.add(({ from, to }) => {
            if(following || unit.shoving || !unit.alive) return
            const stride = to.minus(from)
            const length = stride.length
            const prey = bleedingNearest(battle.enemiesOf(unit), unit)
            const toward = prey ? prey.position.minus(unit.position).normalized : null
            if(length <= 0 || !prey || !toward || stride.dot(toward) / length < TOWARDS_COS) return
            following = true
            try {
                battle.move(unit, toward, TRAIL_LENGTH * unit.stats.move.value, false)
            } finally {
                following = false
            }
        }))
    }
}

/** The closest of some units that holds a bleeding, none when none does. */
function bleedingNearest(units: readonly Unit[], from: Unit): Unit|null {
    let nearest: Unit|null = null
    for(const each of units){
        if(!each.statuses.has(BLEEDING)) continue
        if(!nearest || each.position.distance(from.position) < nearest.position.distance(from.position)) nearest = each
    }
    return nearest
}

export const BLOOD_TRAIL = new BloodTrail()
