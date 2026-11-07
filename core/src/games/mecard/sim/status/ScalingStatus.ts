import { Add, ModifierKey } from "../base/Attribute"
import type { Attribute } from "../base/Attribute"
import type { Observer } from "../base/Observable"
import type { UnitContext } from "../battle/Action"
import type { Unit, UnitStats } from "../battle/Unit"

import { RoundStatus } from "./RoundStatus"
import type { Status } from "./Status"

/** What a scaling status adds to a stat of its unit. */
export interface StatGain {
    /** The stat it adds to. */
    readonly stat: (stats: UnitStats) => Attribute<number>

    /** How much it adds. */
    readonly amount: number
}

/**
 * A round status whose force grows with the rounds it has left: it adds to stats of its unit as much as its
 * rounds, or some share of them, which follow the rounds as they change, by a merge or the count down.
 */
export abstract class ScalingStatus extends RoundStatus {


    /** What it adds to the stats of its unit when it has a number of rounds left. */
    protected abstract gains(rounds: number): readonly StatGain[]

    public override merge(incoming: Status): void {
        super.merge(incoming)
        this.refresh(this.rounds)
    }

    public override shorten(rounds: number): boolean {
        const gone = super.shorten(rounds)
        this.refresh(this.rounds)
        return gone
    }

    protected plug(ctx: UnitContext): Observer[] {
        const { battle, unit } = ctx
        this.#unit = unit
        this.refresh(this.rounds)
        return [
            // Before the count down of the round, which comes after what a status plugs in.
            battle.roundEnded.add(() => this.refresh(this.rounds - 1)),
            ...this.watch(ctx),
            { remove: () => this.#clear() },
        ]
    }

    /** More to plug in, nothing by default: what gives it rounds. */
    protected watch(_ctx: UnitContext): Observer[] {
        return []
    }

    /** Make its gains those of a number of rounds left. */
    protected refresh(rounds: number): void {
        const unit = this.#unit
        if(!unit) return
        for(const { stat, amount } of this.gains(Math.max(0, rounds))) stat(unit.stats).add(this.#key, new Add(amount))
    }


    readonly #key = new ModifierKey("statut croissant")
    #unit: Unit|null = null

    #clear(): void {
        const unit = this.#unit
        if(!unit) return
        for(const { stat } of this.gains(0)) stat(unit.stats).remove(this.#key)
    }
}
