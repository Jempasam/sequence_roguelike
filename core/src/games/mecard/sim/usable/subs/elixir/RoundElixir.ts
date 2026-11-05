import type { UnitContext } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"

import { AbstractUsable } from "../AbstractUsable"

/** An elixir changing its unit for the round: the change is made when drunk, and taken back at its end. */
export abstract class RoundElixir extends AbstractUsable {


    /** Change a unit, and give what takes the change back. */
    public abstract boost(unit: Unit): () => void

    protected act({ battle, unit }: UnitContext): void {
        const takeBack = this.boost(unit)
        const observer = battle.roundEnded.add(() => {
            takeBack()
            observer.remove()
        })
    }
}
