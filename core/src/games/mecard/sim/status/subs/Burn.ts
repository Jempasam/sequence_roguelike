import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { DamageType } from "../../battle/DamageType"
import { BATTLE_ROUND } from "../../base/keywords"
import { HeartCount } from "../../battle/words"

/** How many hearts a burn takes at the end of each round. */
const BURN_DAMAGE = 1

/** A burn: a wound at the end of each round. */
export const BURN = new StatusType("brûlure", statusVisual("burn", 1, 0.55, 0.2), "negative", level => new Burn(level), { description: ["Perd ", new HeartCount(1), " à la fin de chaque ", BATTLE_ROUND, ", pendant ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), "."] })

/** Burning: a heart lost at the end of each round, for as long as its level lasts. */
export class Burn extends RoundStatus {


    public readonly type: StatusType = BURN

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [battle.roundEnded.add(() => {
            battle.signals.notifyStatus.notify({ unit, target: this })
            unit.hearts.damage(BURN_DAMAGE, DamageType.ELEMENTAL, null)
        })]
    }
}
