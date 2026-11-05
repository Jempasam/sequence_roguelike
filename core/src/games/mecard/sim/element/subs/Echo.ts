import { concat } from "../../../../../semantic"
import type { Text } from "../../../../../semantic"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { Ritual } from "../../process/subs/Ritual"
import { GRAND_RITUAL, GrandRitual } from "../../status/subs/GrandRitual"
import type { Element } from "../Element"
import { reaction } from "../reactions"

/** The element a unit keeps by a ritual going on, the one of the round first, none without one. */
export function ritualOf(unit: Unit): Element|null {
    const rituals = unit.processes.filter(each => each instanceof Ritual)
    const last = rituals[rituals.length - 1]
    if(last instanceof Ritual) return last.element
    const status = unit.statusOf(GRAND_RITUAL)
    return status instanceof GrandRitual ? status.element : null
}

/**
 * An element meeting the ritual of whoever plays it, read when it plays: what they give when they react, the
 * element as it is otherwise. Made as a chain is read, it never lasts: a save never sees it.
 */
export class Echo implements Element {


    public readonly word: string
    public readonly negativeText: Text
    public readonly positiveText: Text
    public readonly invokedText: Text

    constructor(
        /** The element meeting the ritual. */
        public readonly element: Element,
    ){
        this.word = element.word
        this.negativeText = concat(element.negativeText, ", mêlé au rituel")
        this.positiveText = concat(element.positiveText, ", mêlé au rituel")
        this.invokedText = concat(element.invokedText, ", mêlé au rituel")
    }


    public get name(): string { return `Écho de ${this.element}` }

    public get color() { return this.element.color }

    public toString(): string { return this.name }

    public toSemString(): Text { return concat("Écho de ", this.element) }

    public applyNegative(ctx: UnitContext, target: Unit): void {
        this.#heard(ctx.unit).applyNegative(ctx, target)
    }

    public applyPositive(ctx: UnitContext, target: Unit): void {
        this.#heard(ctx.unit).applyPositive(ctx, target)
    }

    public invoke(ctx: UnitContext, at: Vector2, direction: Vector2, effect: Element): void {
        const heard = this.#heard(ctx.unit)
        heard.invoke(ctx, at, direction, effect === this ? heard : effect)
    }


    /** What it is for a unit, now. */
    #heard(unit: Unit): Element {
        const ritual = ritualOf(unit)
        return (ritual && reaction(this.element, ritual)) ?? this.element
    }
}
