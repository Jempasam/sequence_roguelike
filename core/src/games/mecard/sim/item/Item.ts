import type { ImagePath } from "../../../../engine/assets/Assets"
import type { Text } from "../../../../semantic"
import type { PlugContext } from "../battle/Action"

/**
 * Something a character carries through the run, which changes it for good: a stat, a reaction to a hit.
 * Plugged in at the start of each battle, through observers and modifiers only, as a status is.
 */
export interface Item {
    readonly name: string

    /** Its picture. */
    readonly icon: ImagePath

    /** What it does, in one sentence, for the player. */
    readonly description: Text

    /**
     * Plug its observers and modifiers into the unit of the character, each kept with `ctx.hold` so the
     * battle takes it back when the item is unplugged.
     */
    init(ctx: PlugContext): void

    /**
     * Unplug it, when it is taken off its unit during a battle and when the battle ends: what it kept with
     * `ctx.hold` is taken back by the battle right after.
     */
    dispose(ctx: PlugContext): void

    /** Its name. */
    toString(): string

    /** Its name, in the color of the items. */
    toSemString(): Text
}
