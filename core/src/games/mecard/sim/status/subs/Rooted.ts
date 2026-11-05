import type { Text } from "../../../../../semantic"
import { ModifierKey, Multiply } from "../../base/Attribute"
import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import { counted } from "../../battle/words"
import type { UnitContext } from "../../battle/Action"
import { StatusType } from "../Status"
import type { Status } from "../Status"

/** A root: the unit cannot move on its own. */
export const ROOTED = new StatusType("racines", rgba(0.45, 0.8, 0.3), "negative")

/** Rooted: the next steps of the unit cannot move it, though it still acts. */
export class Rooted implements Status {


    public readonly type = ROOTED

    constructor(
        /** How many of its steps it still holds for. */
        public steps: number,
    ){}


    public copy(): Rooted { return new Rooted(this.steps) }

    public toString(): string { return `${ROOTED} ${counted(this.steps, "étape")}` }

    public toSemString(): Text { return [ROOTED, ` ${counted(this.steps, "étape")}`] }

    public init({ battle, unit }: UnitContext): void {
        unit.stats.mobility.add(this.#key, new Multiply(0))
        this.#observer = unit.stepEnded.add(() => {
            this.steps--
            if(this.steps <= 0) battle.removeStatus(unit, ROOTED)
        })
    }

    public remove({ unit }: UnitContext): void {
        unit.stats.mobility.remove(this.#key)
        this.#observer?.remove()
    }

    public shorten(steps: number): boolean {
        this.steps -= steps
        return this.steps <= 0
    }

    /** New roots add up. */
    public merge(incoming: Status): void {
        if(incoming instanceof Rooted) this.steps += incoming.steps
    }


    readonly #key = new ModifierKey("racines")
    #observer?: Observer
}
