import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { StatusType } from "../Status"

/** A rage: the unit turns on an enemy before each of its steps. */
export const ENRAGED = new StatusType("rage", rgba(1, 0.3, 0.25), "neutral")

/** Enraged: before each of its steps, it turns straight at an enemy drawn at random, wherever it stands. */
export class Rage extends RoundStatus {


    public readonly type = ENRAGED

    public copy(): Rage { return new Rage(this.rounds) }

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [unit.stepStarted.add(() => {
            const target = battle.rng.pick(battle.enemiesOf(unit))
            const toward = target?.position.minus(unit.position).normalized
            if(toward) battle.turn(unit, toward)
        })]
    }
}
