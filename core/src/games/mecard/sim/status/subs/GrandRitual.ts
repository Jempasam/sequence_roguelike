import { concat } from "../../../../../semantic"
import type { Text } from "../../../../../semantic"
import type { Observer } from "../../base/Observable"
import { counted } from "../../battle/words"
import type { Element } from "../../element/Element"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, familyType, statusVisual } from "../Status"
import type { StatusType } from "../Status"
import { elementOf, elementVariants } from "../StatusVariants"
import type { ElementType } from "../StatusVariants"

/** A grand ritual: an element kept for rounds. */
export const GRAND_RITUAL = familyType("grand rituel", statusVisual("grand_ritual", 0.8, 0.6, 1), "positive", { description: ["Garde un élément pendant ", STATUS_LEVEL, " rounds, pour ce qui le rencontre : un écho."] })

/** The kinds of grand ritual, one for each element. */
export const GRAND_RITUALS = elementVariants(
    GRAND_RITUAL, element => `${GRAND_RITUAL} de ${element}`, (type, level) => new GrandRitual(type, level),
)

/** An element kept for rounds, for what meets it: an echo. Its level is its rounds. */
export class GrandRitual extends RoundStatus {


    constructor(
        public readonly type: ElementType,
        level: number,
    ){
        super(level)
    }


    /** The element it keeps. */
    public get element(): Element { return this.type.element }

    public override toString(): string { return `${this.type} ${counted(this.level, "round")}` }

    public override toSemString(): Text {
        return concat(GRAND_RITUAL, " de ", this.element, ` ${counted(this.level, "round")}`)
    }

    protected plug(): Observer[] {
        return []
    }
}

/** The kind of a grand ritual of an element. */
export function ritualType(element: Element): StatusType { return GRAND_RITUALS.of(element) }

/** The element kept by a kind of status, none when it is not the kind of a grand ritual. */
export function ritualElementOf(type: StatusType): Element|null { return elementOf(type, GRAND_RITUAL) }
