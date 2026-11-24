import type { Text } from "../../../../../../semantic"
import type { Unit } from "../../../battle/Unit"
import type { UnitContext } from "../../../battle/Action"

/**
 * What an element of a body does for a unit: it gives it a potion or hearts. It is also what the body it
 * calls is given as it arrives.
 */
export interface Boon {

    /** What it is called, in the name of the element. */
    readonly name: string

    /** What it does, as a card tells it. */
    readonly text: Text

    /** Give it to a unit, as the unit of the context does. */
    give(ctx: UnitContext, target: Unit): void
}
