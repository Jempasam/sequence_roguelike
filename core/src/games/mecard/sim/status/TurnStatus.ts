import { plainText } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { counted } from "../battle/words"
import type { UnitContext } from "../battle/Action"
import { INCOMING_STEP } from "../battle/mecanic/step/signals"
import type { IncomingStep } from "../battle/mecanic/step/signals"

import { BaseStatus } from "./BaseStatus"

/**
 * A status acting on the steps of its unit as each is about to start, a level lost each time: its level is
 * the steps it acts on. It stays from a round to the next until none is left, and several act on a same step.
 */
export abstract class TurnStatus extends BaseStatus {


    public override toString(): string { return `${this.type} ${plainText(counted(this.level, "tour"))}` }

    public override toSemString(): Text { return [this.type, " ", counted(this.level, "tour")] }

    public init(ctx: UnitContext): void {
        const { battle, unit } = ctx
        this.keep(unit.observers.of(INCOMING_STEP).add(incoming => {
            this.act(incoming, ctx)
            this.setLevel(this.level - 1)
            if(this.level <= 0) battle.removeStatus(unit, this.type)
        }))
    }

    public remove(): void {
        this.letGo()
    }


    /** What it does to the step about to start. */
    protected abstract act(incoming: IncomingStep, ctx: UnitContext): void
}
