import { concat } from "../../../../../semantic"
import type { Text } from "../../../../../semantic"
import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import { counted } from "../../battle/words"
import type { Element } from "../../element/Element"
import { RoundStatus } from "../RoundStatus"
import { StatusType } from "../Status"
import type { Status } from "../Status"

/** A grand ritual: an element kept for rounds. */
export const GRAND_RITUAL = new StatusType("grand rituel", rgba(0.8, 0.6, 1), "positive")

/** An element kept for rounds, for what meets it: an echo. */
export class GrandRitual extends RoundStatus {


    public readonly type = GRAND_RITUAL

    constructor(
        /** The element it keeps. */
        public element: Element,

        rounds: number,
    ){
        super(rounds)
    }


    public override toString(): string { return `${GRAND_RITUAL} de ${this.element} ${counted(this.rounds, "round")}` }

    public override toSemString(): Text {
        return concat(GRAND_RITUAL, " de ", this.element, ` ${counted(this.rounds, "round")}`)
    }

    public copy(): GrandRitual { return new GrandRitual(this.element, this.rounds) }

    /** A new one adds its rounds, and keeps its element. */
    public override merge(incoming: Status): void {
        super.merge(incoming)
        if(incoming instanceof GrandRitual) this.element = incoming.element
    }


    protected plug(): Observer[] {
        return []
    }
}
