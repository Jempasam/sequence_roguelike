import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { BATTLE_ROUND } from "../../base/keywords"
import { TURN } from "../../battle/mecanic/turn/keyword"
import * as Turn from "../../battle/mecanic/turn"

/** A rage: the unit turns on an enemy before each of its steps. */
export const ENRAGED = new StatusType("rage", statusVisual("rage", 1, 0.3, 0.25), "neutral", level => new Rage(level), { description: ["Avant chacun de ses pas, ", TURN.as("se tourne"), " droit vers un ennemi tiré au hasard, où qu'il soit, pendant ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), "."] })

/** Enraged: before each of its steps, it turns straight at an enemy drawn at random, wherever it stands. */
export class Rage extends RoundStatus {


    public readonly type: StatusType = ENRAGED

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [unit.stepStarted.add(() => {
            const target = battle.rng.pick(battle.enemiesOf(unit))
            const toward = target?.position.minus(unit.position).normalized
            if(toward) Turn.turn(battle, unit, toward)
        })]
    }
}
