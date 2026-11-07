import type { Text } from "../../../../../semantic"
import { Forced, ModifierKey } from "../../base/Attribute"
import { rgba } from "../../base/Rgba"
import type { UnitContext } from "../../battle/Action"
import { BaseStatus } from "../BaseStatus"
import { StatusType } from "../Status"

/** A possession: another will drives the unit. A clone of the unit is not possessed. */
export const POSSESSED = new StatusType("possédé", rgba(0.7, 0.45, 0.95), "neutral", level => new Possessed(level), {
    cloned: false,
})

/**
 * Possessed: the deck of the unit is shuffled at each refill, whatever it is.
 *
 * @remarks
 * What it does is plugged in by {@link Possessed.init} alone, so a battle loaded has it back. Shuffling the
 * deck as it comes is left to who brings it: the deck of a battle loaded is shuffled already.
 */
export class Possessed extends BaseStatus {


    public readonly type: StatusType = POSSESSED

    public override toString(): string { return POSSESSED.name }

    public override toSemString(): Text { return POSSESSED }

    public init({ unit }: UnitContext): void {
        unit.stats.ordered.add(this.#key, new Forced(false))
    }

    public remove({ unit }: UnitContext): void {
        unit.stats.ordered.remove(this.#key)
    }


    readonly #key = new ModifierKey("possédé")
}
