import { concat } from "../../../../../semantic"
import type { Text } from "../../../../../semantic"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import type { Element } from "../../element/Element"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, familyType, statusVisual } from "../Status"
import type { StatusType } from "../Status"
import { elementVariants } from "../StatusVariants"
import type { ElementType } from "../StatusVariants"

/** An element coating: the body applies the negative of an element to what it touches. */
export const ELEMENT_COATING = familyType("enrobage élémentaire", statusVisual("coated", 0.7, 0.75, 1), "positive", {
    description: ["Au contact d'une unité, applique à celle-ci le négatif de son élément. Dure encore ", STATUS_LEVEL, " rounds."],
})

/** The kinds of element coating, one for each element. */
export const ELEMENT_COATINGS = elementVariants(
    ELEMENT_COATING, element => `${ELEMENT_COATING} (${element})`, (type, level) => new ElementCoatingStatus(type, level),
)

/**
 * An element coating: while it lasts, each time its unit touches another, whoever moves, the other takes
 * the negative of the element. It counts rounds as a coat does, and never takes itself off before.
 */
export class ElementCoatingStatus extends RoundStatus {


    constructor(
        public readonly type: ElementType,
        level: number,
    ){
        super(level)
    }


    /** The element it applies. */
    public get element(): Element { return this.type.element }

    public override toString(): string { return `${ELEMENT_COATING} (${this.element})` }

    public override toSemString(): Text { return concat(ELEMENT_COATING, " (", this.element, ")") }

    protected plug(ctx: UnitContext): Observer[] {
        const { battle, unit } = ctx
        return [
            battle.signals.collided.add(({ unit: mover, struck }) => {
                const other = mover === unit ? struck : struck === unit ? mover : null
                if(other?.alive) this.element.applyNegative(ctx, other)
            }),
        ]
    }
}

/** The kind of an element coating of an element. */
export function elementCoatingOf(element: Element): StatusType { return ELEMENT_COATINGS.of(element) }
