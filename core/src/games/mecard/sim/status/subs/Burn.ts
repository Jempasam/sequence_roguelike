import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { StatusType } from "../Status"

/** How many hearts a burn takes at the end of each round. */
const BURN_DAMAGE = 1

/** A burn: a wound at the end of each round. */
export const BURN = new StatusType("brûlure", rgba(1, 0.55, 0.2), "negative", level => new Burn(level))

/** Burning: a heart lost at the end of each round, for as long as its level lasts. */
export class Burn extends RoundStatus {


    public readonly type: StatusType = BURN

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [battle.roundEnded.add(() => {
            battle.signals.notifyStatus.notify({ unit, status: this })
            unit.hearts.damage(BURN_DAMAGE, "elemental", null)
        })]
    }
}
