import type { Text } from "../../../../../semantic"
import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { pour } from "../../potion/Potion"
import type { Dose } from "../../potion/Potion"
import { StatusType } from "../Status"
import type { Status } from "../Status"

/** A coated blade: the blows pour a potion. */
export const COATED = new StatusType("lame enduite", rgba(0.6, 0.85, 0.75), "positive")

/** Coated: until the end of the round, each of its attacks that lands pours a potion on what it hit. */
export class Coated implements Status {


    public readonly type = COATED

    constructor(
        public readonly dose: Dose,

        /** The level it pours its potion at. */
        public readonly level: number,
    ){}


    public copy(): Coated { return new Coated(this.dose, this.level) }

    public toString(): string { return `${COATED} (${this.dose.potion})` }

    public toSemString(): Text { return [COATED, " (", this.dose.potion, ")"] }

    public init({ battle, unit }: UnitContext): void {
        this.#observers.push(
            unit.hitting.add(({ target }) => pour(battle, this.dose, target, this.level)),
            battle.roundEnded.add(() => battle.removeStatus(unit, COATED)),
        )
    }

    public remove(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers.length = 0
    }

    /** A new coat replaces nothing: the first one stays. */
    public merge(): void {}


    readonly #observers: Observer[] = []
}
