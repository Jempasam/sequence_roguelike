import type { Text } from "../../../../semantic"
import type { Rgba } from "../base/Rgba"
import type { Vector2 } from "../base/Vector2"
import type { UnitContext } from "../battle/Action"
import type { Unit } from "../battle/Unit"

/**
 * A magical element: what it does against a unit, what it does for one, and what it calls into the arena.
 *
 * @remarks
 * An element holds no state, so a card, a hazard or a ritual may hold the same one: a save names it. What a
 * card does with it, a spell, an aura, a conjuration, is the card's.
 */
export interface Element {
    /** What it is called, `Feu`: the name of its card too. */
    readonly name: string

    /** The color its name and its bolts show in. */
    readonly color: Rgba

    /** What the preview of a spell says on the unit it touches. */
    readonly word: string

    /** What it does against a unit, for the player. */
    readonly negativeText: Text

    /** What it does for a unit, for the player. */
    readonly positiveText: Text

    /** What it calls into the arena, for the player. */
    readonly invokedText: Text

    /** Its name, for the console and the log. */
    toString(): string

    /** Its name in its color. */
    toSemString(): Text

    /** Do to a unit what it does against it, for the unit of the context. */
    applyNegative(ctx: UnitContext, target: Unit): void

    /** Do to a unit what it does for it, for the unit of the context. */
    applyPositive(ctx: UnitContext, target: Unit): void

    /**
     * Call it into the arena, for the unit of the context.
     *
     * @param at - Where it comes.
     * @param direction - Where it goes or faces, a meter long.
     * @param effect - The element whose negative what it calls applies: itself, but for a crossed spell.
     */
    invoke(ctx: UnitContext, at: Vector2, direction: Vector2, effect: Element): void
}
