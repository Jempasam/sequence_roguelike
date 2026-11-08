import type { Visual } from "../../base/Visual"
import type { Text } from "../../../../../semantic"
import { colored, rgba } from "../../base/Rgba"
import type { UnitContext } from "../../battle/Action"
import type { Usable, UsableSlot } from "../Usable"

/** How a usable is used, beyond what it does: its charges, and whether they refill. */
export interface UsableOptions {
    /** How many times it may be used before it is spent, once by default. */
    readonly charges?: number

    /** Are its charges filled again at the start of each battle? No by default. */
    readonly refill?: "battle"
}

/** The color the name of a usable is written in. */
const USABLE_COLOR = rgba(0.55, 0.95, 0.85)

/**
 * What every usable shares: a name, a description, its charges, telling itself by its name in their color,
 * and a charge spent at each use, after it acted.
 */
export abstract class AbstractUsable implements Usable {


    constructor(
        public readonly name: string,

        /** Its picture. */
        public readonly icon: Visual,

        /** What it does, in one sentence, for the player. */
        public readonly description: Text,

        options: UsableOptions = {},
    ){
        this.charges = options.charges
        this.refill = options.refill
    }


    public readonly charges: number|undefined
    public readonly refill: "battle"|undefined

    public use(ctx: UnitContext, slot: UsableSlot): void {
        this.act(ctx, slot)
        slot.spend()
    }

    public toString(): string { return this.name }

    public toSemString(): Text { return colored(USABLE_COLOR, this.name) }


    /** Do what it does to the unit using it, and maybe to others. */
    protected abstract act(ctx: UnitContext, slot: UsableSlot): void
}
