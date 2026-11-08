import { ModifierKey, Multiply } from "../../base/Attribute"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** The factor a slowness puts on the moves of its unit. */
export const SLOWNESS_FACTOR = 0.5

/** A slowness: the moves go shorter. */
export const SLOWED = new StatusType("lenteur", statusVisual("slow", 0.5, 0.6, 0.9), "negative", level => new Slowness(level), { description: ["Agilité réduite de moitié : chaque déplacement va moitié moins loin, pendant ", STATUS_LEVEL, " rounds."] })

/** Slowed: its agility halved, so each of its moves goes half as far. */
export class Slowness extends RoundStatus {


    public readonly type: StatusType = SLOWED

    protected plug({ unit }: UnitContext): Observer[] {
        const key = new ModifierKey("lenteur")
        unit.stats.move.add(key, new Multiply(SLOWNESS_FACTOR))
        return [{ remove: () => unit.stats.move.remove(key) }]
    }
}
