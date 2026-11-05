import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { StatusType } from "../Status"

/** A poison: the longer it has left, the more it hurts. */
export const POISONED = new StatusType("poison", rgba(0.6, 0.9, 0.2), "negative")

/** Poisoned: at the end of each round, as many hearts lost as rounds it has left. */
export class Poison extends RoundStatus {


    public readonly type = POISONED

    public copy(): Poison { return new Poison(this.rounds) }

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [battle.roundEnded.add(() => {
            battle.signals.notifyStatus.notify({ unit, status: this })
            unit.hearts.damage(this.rounds, "elemental", null)
        })]
    }
}
