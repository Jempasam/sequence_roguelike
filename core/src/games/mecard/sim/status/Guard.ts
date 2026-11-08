import type { Text } from "../../../../semantic"
import type { Observer } from "../base/Observable"
import type { UnitContext } from "../battle/Action"
import type { IncomingDamage } from "../battle/events"
import type { Unit } from "../battle/Unit"

import { BaseStatus } from "./BaseStatus"

/** What a guard reacts to an attack it stopped with: the attack, and the attacker it came from. */
export interface Parried {
    readonly incoming: IncomingDamage

    /** Who struck. */
    readonly attacker: Unit

    /** How many hearts the attack would have taken, before it was stopped. */
    readonly amount: number
}

/**
 * A guard: its level is the attacks it stops. Each physical attack it stops lands nothing and takes one off, and
 * so does each start of a turn of its unit. What a kind of guard does more, it does in {@link react}.
 */
export abstract class Guard extends BaseStatus {


    public override toString(): string { return `${this.type} ${this.level}` }

    public override toSemString(): Text { return [this.type, ` ${this.level}`] }


    public init(ctx: UnitContext): void {
        const { battle, unit } = ctx
        this.#observers.push(
            unit.stepStarted.add(() => battle.applyStatus(unit, this.type, -1)),
            unit.hearts.onIncoming.add(incoming => {
                if(incoming.nature !== "physical" || incoming.derived || incoming.amount <= 0) return
                if(this.level <= 0) return
                const amount = incoming.amount
                incoming.amount = 0
                battle.signals.notifyStatus.notify({ unit, status: this })
                // Spent before it reacts: what its reaction sets off, a push into a wall, finds it spent already.
                battle.applyStatus(unit, this.type, -1)
                if(incoming.source && incoming.source !== unit) this.react(ctx, { incoming, attacker: incoming.source, amount })
            }),
        )
    }

    public remove(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers.length = 0
    }


    /** What it does more to an attack it stopped, coming from an attacker. */
    protected abstract react(ctx: UnitContext, parried: Parried): void


    readonly #observers: Observer[] = []
}
