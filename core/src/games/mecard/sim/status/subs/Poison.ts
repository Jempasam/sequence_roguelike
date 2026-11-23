import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { DamageType } from "../../battle/DamageType"
import { BATTLE_ROUND, HEART } from "../../base/keywords"

/** A poison: the longer it has left, the more it hurts. */
export const POISONED = new StatusType("poison", statusVisual("poison", 0.6, 0.9, 0.2), "negative", level => new Poison(level), { description: ["À la fin de chaque ", BATTLE_ROUND, ", perd autant de ", HEART.as("cœurs"), " que de ", BATTLE_ROUND.as("rounds"), " restants (", STATUS_LEVEL, ")."] })

/** Poisoned: at the end of each round, as many hearts lost as rounds it has left. */
export class Poison extends RoundStatus {


    public readonly type: StatusType = POISONED

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [battle.roundEnded.add(() => {
            battle.signals.notifyStatus.notify({ unit, target: this })
            unit.hearts.damage(this.level, DamageType.ELEMENTAL, null)
        })]
    }
}
