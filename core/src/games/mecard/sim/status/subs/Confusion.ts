import { Vector2 } from "../../base/Vector2"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { BATTLE_ROUND } from "../../base/keywords"
import { TURN } from "../../battle/mecanic/turn/keyword"
import * as Turn from "../../battle/mecanic/turn"

/** The chance a confused unit goes a random way at each of its steps. */
export const CONFUSION_CHANCE = 0.5

/** The eight ways a confused unit may face, from the top, an eighth apart: no trigonometry needed. */
const WAYS: readonly Vector2[] = [Vector2.UP, Vector2.RIGHT, Vector2.DOWN, Vector2.LEFT].flatMap(way => {
    return [way, way.eighth(1)]
})

/** A confusion: the unit may face anywhere before a step. */
export const CONFUSED = new StatusType("confusion", statusVisual("confusion", 0.9, 0.5, 0.9), "negative", level => new Confusion(level), { description: ["Avant chaque pas, une chance sur deux de ", TURN.as("se tourner"), " vers l'une des huit directions au hasard, pendant ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), "."] })

/** Confused: before each of its steps, one chance in two to face one of the eight ways, drawn at random. */
export class Confusion extends RoundStatus {


    public readonly type: StatusType = CONFUSED

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [unit.stepStarted.add(() => {
            if(!battle.rng.chance(CONFUSION_CHANCE)) return
            const way = battle.rng.pick(WAYS)
            if(way) Turn.turn(battle, unit, way)
        })]
    }
}
