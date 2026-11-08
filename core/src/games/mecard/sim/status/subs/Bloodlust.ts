import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { frailest } from "../../battle/Unit"
import type { Unit } from "../../battle/Unit"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** How far the unit goes on, in meters, before its agility. */
export const BLOODLUST_STRIDE = 0.7

/** A bloodlust: the unit goes on toward whoever is weakest. */
export const BLOODLUST = new StatusType("soif de sang", statusVisual("bloodlust", 0.85, 0.1, 0.2), "positive", level => new Bloodlust(level), { description: ["Un pas qui rapproche de l'ennemi le plus fragile va une foulée plus loin, pendant ", STATUS_LEVEL, " rounds."] })

/** Thirsting for blood: a step of the unit bringing it closer to the frailest enemy goes a stride further. */
export class Bloodlust extends RoundStatus {


    public readonly type: StatusType = BLOODLUST

    // Read over a whole step: a move is told stride by stride, and the stride it adds is no step of its own.
    protected plug({ battle, unit }: UnitContext): Observer[] {
        let prey: Unit|null = null
        let distance = 0
        return [
            unit.stepStarted.add(() => {
                prey = frailest(battle.enemiesOf(unit))
                distance = prey ? prey.position.distance(unit.position) : 0
            }),
            unit.stepEnded.add(() => {
                if(!prey?.alive || !unit.alive) return
                if(prey.position.distance(unit.position) >= distance) return
                battle.move(unit, unit.direction, BLOODLUST_STRIDE * unit.stats.move.value)
            }),
        ]
    }
}
