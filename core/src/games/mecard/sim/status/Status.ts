import type { Text } from "../../../../semantic"
import { colored } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"
import type { UnitContext } from "../battle/Action"

/** What a status is to the unit holding it: what water washes off is negative. */
export type Polarity = "negative"|"positive"|"neutral"

/** A kind of status: a unit holds one status of each kind at most. Compared by reference. */
export class StatusType {


    constructor(
        public readonly name: string,

        /** The color its name is written in. */
        public readonly color: Rgba,

        /** What it is to the unit holding it. */
        public readonly polarity: Polarity,
    ){}


    public toString(): string { return this.name }

    public toSemString(): Text { return colored(this.color, this.name) }
}

/**
 * A lasting effect on a unit: a burn, a root, a dodge.
 *
 * @remarks
 * It acts on its unit only through the observers and the modifiers that {@link Status.init} plugs in, plus
 * its own data (what is left of it, how much it stacked). So a saved status is its data alone: loading
 * calls `init` again, which plugs everything back.
 */
export interface Status {
    readonly type: StatusType

    /** Its kind and what is left of it, such as `brûlure 2 rounds`. */
    toString(): string

    /** The same, its kind in its color. */
    toSemString(): Text

    /** Plug its observers and modifiers in. */
    init(ctx: UnitContext): void

    /** Take its observers and modifiers back. */
    remove(ctx: UnitContext): void

    /** Take in another status of its kind, applied while it is on: last longer, or stack. */
    merge(incoming: Status): void

    /**
     * Wear it down by an amount, as an antidote does, and say whether nothing is left of it. A status
     * without it is taken off whole.
     */
    shorten?(amount: number): boolean

    /** The same status, as it stands, for another unit: without it, a perfect clone goes without. */
    copy?(): Status
}
