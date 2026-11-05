import { concat } from "../../../../../semantic"
import type { Rgba } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { AbstractElement } from "../AbstractElement"
import type { Element } from "../Element"

/**
 * Two elements reacting: it does what both do, and calls what the first calls, which then applies what the
 * compound applies.
 */
export class Compound extends AbstractElement {


    constructor(
        name: string, color: Rgba, word: string,
        public readonly first: Element,
        public readonly second: Element,
    ){
        super(
            name, color, word,
            concat(first.negativeText, ", et ", second.negativeText),
            concat(first.positiveText, ", et ", second.positiveText),
            first.invokedText,
        )
    }


    public applyNegative(ctx: UnitContext, target: Unit): void {
        this.first.applyNegative(ctx, target)
        this.second.applyNegative(ctx, target)
    }

    public applyPositive(ctx: UnitContext, target: Unit): void {
        this.first.applyPositive(ctx, target)
        this.second.applyPositive(ctx, target)
    }

    public invoke(ctx: UnitContext, at: Vector2, direction: Vector2, effect: Element): void {
        this.first.invoke(ctx, at, direction, effect)
    }
}
