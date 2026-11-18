import type { Visual } from "../base/Visual"
import type { Text } from "../../../../semantic"
import type { PlugContext } from "../battle/Action"
import type { Previewable } from "../battle/preview/Previewable"
import type { Heart } from "../heart/Heart"

/** What a fight leaves of a character, for the items that mend it once the fight is over. */
export interface Survivor {
    /** Its hearts, as the fight left them: those lost are empty. */
    readonly hearts: Heart[]

    /** Did it fall in the fight: was no heart of it left standing? */
    readonly fell: boolean
}

/**
 * Something a character carries through the run, which changes it for good: a stat, a reaction to a hit.
 * Plugged in at the start of each battle, through observers and modifiers only, as a status is.
 */
export interface Item extends Partial<Previewable> {
    readonly name: string

    /** Its picture. */
    readonly icon: Visual

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

    /**
     * Mend a character once a fight it fought is won, after the party stood its fallen up again. None by
     * default. A fight lost is the end of the run: nothing is mended.
     */
    afterFight?(survivor: Survivor): void

    /** Its name. */
    toString(): string

    /** Its name, in the color of the items. */
    toSemString(): Text
}
