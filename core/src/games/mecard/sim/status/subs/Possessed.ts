import type { Text } from "../../../../../semantic"
import { Forced, ModifierKey } from "../../base/Attribute"
import { rgba } from "../../base/Rgba"
import type { UnitContext } from "../../battle/Action"
import { StatusType } from "../Status"
import type { Status } from "../Status"

/** A possession: another will drives the unit. */
export const POSSESSED = new StatusType("possédé", rgba(0.7, 0.45, 0.95), "neutral")

/**
 * Possessed: the deck of the unit is shuffled at each refill, whatever it is.
 *
 * @remarks
 * What it does is plugged in by {@link Possessed.init} alone, so a battle loaded has it back. Shuffling the
 * deck as it comes is left to who brings it: the deck of a battle loaded is shuffled already.
 */
export class Possessed implements Status {


    public readonly type = POSSESSED

    public toString(): string { return POSSESSED.name }

    public toSemString(): Text { return POSSESSED }

    public init({ unit }: UnitContext): void {
        unit.stats.ordered.add(this.#key, new Forced(false))
    }

    public remove({ unit }: UnitContext): void {
        unit.stats.ordered.remove(this.#key)
    }

    /** Possessed while possessed changes nothing. */
    public merge(): void {}


    readonly #key = new ModifierKey("possédé")
}
