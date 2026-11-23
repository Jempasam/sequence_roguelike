import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { HeartCount } from "../../battle/words"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { BATTLE_ROUND } from "../../base/keywords"

/** How many hearts a swallow heals at the end of each round, before the healing of the unit. */
export const SWALLOW_HEAL = 1

/** A swallow: a heart back at the end of each round, until the unit is hurt. */
export const SWALLOWED = new StatusType("hirondelle", statusVisual("swallow", 0.55, 0.85, 0.85), "positive", level => new Swallow(level), { description: ["À la fin de chaque ", BATTLE_ROUND, ", soigne ", new HeartCount(SWALLOW_HEAL), " ; disparaît dès que l'unité subit des dégâts. Dure ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), "."] })

/** Swallowed: at the end of each round, a heart healed, until it takes damage. */
export class Swallow extends RoundStatus {


    public readonly type: StatusType = SWALLOWED

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [
            battle.roundEnded.add(() => {
                battle.signals.notifyStatus.notify({ unit, target: this })
                unit.hearts.heal(SWALLOW_HEAL)
            }),
            unit.hearts.onDamage.add(() => battle.removeStatus(unit, this.type)),
        ]
    }
}
