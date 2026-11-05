import { Add, ModifierKey } from "../../base/Attribute"
import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { RoundStatus } from "../RoundStatus"
import { StatusType } from "../Status"

/** How many hearts a weakness takes off the strength of its unit. */
export const WEAKNESS_MALUS = 1

/** A weakness: the blows hit softer. */
export const WEAKENED = new StatusType("faiblesse", rgba(0.75, 0.6, 0.5), "negative")

/** Weakened: its strength lowered, so each of its blows takes less. */
export class Weakness extends RoundStatus {


    public readonly type = WEAKENED

    public copy(): Weakness { return new Weakness(this.rounds) }

    protected plug({ unit }: UnitContext): Observer[] {
        const key = new ModifierKey("faiblesse")
        unit.stats.strength.add(key, new Add(-WEAKNESS_MALUS))
        return [{ remove: () => unit.stats.strength.remove(key) }]
    }
}
