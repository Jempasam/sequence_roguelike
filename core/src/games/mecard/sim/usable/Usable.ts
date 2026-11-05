import type { Text } from "../../../../semantic"
import type { UnitContext } from "../battle/Action"
import type { Unit } from "../battle/Unit"

/**
 * Something a character carries to use, once or for a number of charges: chosen during a preparation, it
 * acts at the start of the execution, after the preparation effects. It handles its own place in the belt,
 * through the {@link UsableSlot} it is given: it spends a charge, and leaves the belt once spent.
 *
 * @remarks
 * Its use is chosen with the chains, so it travels with them to the viewers, who play it the same: it acts
 * at a fixed moment of the round, never at the click.
 */
export interface Usable {
    readonly name: string

    /** What it does, in one sentence, for the player. */
    readonly description: Text

    /** How many times it may be used before it is spent: once when none. */
    readonly charges?: number

    /**
     * Are its charges filled again at the start of each battle? Then, spent, it stays in the belt, waiting
     * for the next battle. It leaves the belt once spent otherwise.
     */
    readonly refill?: "battle"

    /** Do what it does to the unit using it, and maybe to others, then see to its place in the belt. */
    use(ctx: UnitContext, slot: UsableSlot): void

    /** Its name. */
    toString(): string

    /** Its name, in the color of the usables. */
    toSemString(): Text
}

/** Where a usable lies in the belt of a unit, as the battle gives it to the usable when it is used. */
export interface UsableSlot {
    /** The unit carrying it. */
    readonly unit: Unit

    /** What the belt holds: the usable and its charges left. */
    readonly carried: Carried

    /** Spend one of its charges: once none is left, it leaves the belt, unless it refills. */
    spend(): void

    /** Take it out of the belt for good. */
    remove(): void
}

/** A usable in a belt, with the charges it has left. */
export class Carried {


    constructor(
        public readonly usable: Usable,

        /** The charges it has left, all of them by default. */
        public charges = usable.charges ?? 1,
    ){}


    /** Is it out of charges, waiting for a refill? */
    public get spent(): boolean { return this.charges <= 0 }

    /** Fill its charges again, when it refills at each battle. */
    public refill(): void {
        if(this.usable.refill === "battle") this.charges = this.usable.charges ?? 1
    }

    /** Its name, and its charges left when it has several. */
    public toString(): string {
        return this.#counted ? `${this.usable.name} (${this.charges})` : this.usable.name
    }

    /** The same, its name in its color. */
    public toSemString(): Text {
        return this.#counted ? [this.usable, ` (${this.charges})`] : [this.usable]
    }


    /** Does it have charges worth telling? */
    get #counted(): boolean {
        return (this.usable.charges ?? 1) > 1
    }
}
