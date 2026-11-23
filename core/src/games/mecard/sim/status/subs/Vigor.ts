import { Add, ModifierKey } from "../../base/Attribute"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { BATTLE_ROUND } from "../../base/keywords"

/** How many hearts a vigor adds to the strength of its unit. */
export const VIGOR_BONUS = 1

/** A vigor: the blows hit harder. */
export const VIGOROUS = new StatusType("vigueur", statusVisual("vigor", 0.9, 0.5, 0.3), "positive", level => new Vigor(level), { description: ["Sa force est accrue : chacun de ses coups prend plus, pendant ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), "."] })

/** Vigorous: its strength raised, so each of its blows takes more. */
export class Vigor extends RoundStatus {


    public readonly type: StatusType = VIGOROUS

    protected plug({ unit }: UnitContext): Observer[] {
        const key = new ModifierKey("vigueur")
        unit.stats.strength.add(key, new Add(VIGOR_BONUS))
        return [{ remove: () => unit.stats.strength.remove(key) }]
    }
}
