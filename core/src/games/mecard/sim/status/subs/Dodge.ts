import type { Text } from "../../../../../semantic"
import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { StatusType } from "../Status"
import type { Status } from "../Status"

/** A dodge: the physical attacks miss. */
export const DODGE = new StatusType("esquive", rgba(0.55, 0.8, 1), "positive")

/** Dodging: the physical damage misses it until the end of the round. */
export class Dodge implements Status {


    public readonly type = DODGE

    public copy(): Dodge { return new Dodge() }

    public toString(): string { return DODGE.name }

    public toSemString(): Text { return DODGE }


    public init({ battle, unit }: UnitContext): void {
        this.#observers.push(
            unit.hearts.onIncoming.add(incoming => {
                if(incoming.nature !== "physical") return
                battle.signals.notifyStatus.notify({ unit, status: this })
                incoming.amount = 0
            }),
            battle.roundEnded.add(() => battle.removeStatus(unit, DODGE)),
        )
    }

    public remove(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers.length = 0
    }

    /** Dodging while dodging changes nothing. */
    public merge(): void {}


    readonly #observers: Observer[] = []
}
