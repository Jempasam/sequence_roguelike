import { ModifierKey, Multiply } from "../../base/Attribute"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { BATTLE_ROUND } from "../../base/keywords"

/** The factor a swiftness puts on the moves of its unit. */
export const SWIFTNESS_FACTOR = 2

/** A swiftness: the moves go further. */
export const SWIFT = new StatusType("célérité", statusVisual("swift", 0.95, 0.85, 0.35), "positive", level => new Swiftness(level), { description: ["Agilité doublée : chaque déplacement va deux fois plus loin, pendant ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), "."] })

/** Swift: its agility doubled, so each of its moves goes twice as far. */
export class Swiftness extends RoundStatus {


    public readonly type: StatusType = SWIFT

    protected plug({ unit }: UnitContext): Observer[] {
        const key = new ModifierKey("célérité")
        unit.stats.move.add(key, new Multiply(SWIFTNESS_FACTOR))
        return [{ remove: () => unit.stats.move.remove(key) }]
    }
}
