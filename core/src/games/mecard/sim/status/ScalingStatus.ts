import { Add, ModifierKey } from "../base/Attribute"
import type { Attribute } from "../base/Attribute"
import type { Observer } from "../base/Observable"
import type { UnitContext } from "../battle/Action"
import type { Unit, UnitStats } from "../battle/Unit"

import { RoundStatus } from "./RoundStatus"

/** What a scaling status adds to a stat of its unit. */
export interface StatGain {
    /** The stat it adds to. */
    readonly stat: (stats: UnitStats) => Attribute<number>

    /** How much it adds. */
    readonly amount: number
}

/**
 * A round status whose force grows with its level: it adds to stats of its unit as much as its level, or some
 * share of it, which follow the level as it changes, by a stack, an antidote or the count down.
 */
export abstract class ScalingStatus extends RoundStatus {


    /** What it adds to the stats of its unit at a level. */
    protected abstract gains(level: number): readonly StatGain[]

    public override setLevel(level: number): void {
        super.setLevel(level)
        this.#refresh()
    }

    protected plug(ctx: UnitContext): Observer[] {
        this.#unit = ctx.unit
        this.#refresh()
        return [...this.watch(ctx), { remove: () => this.#clear() }]
    }

    /** More to plug in, nothing by default: what gives it rounds. */
    protected watch(_ctx: UnitContext): Observer[] {
        return []
    }


    readonly #key = new ModifierKey("statut croissant")
    #unit: Unit|null = null

    /** Make its gains those of its level. */
    #refresh(): void {
        const unit = this.#unit
        if(!unit) return
        for(const { stat, amount } of this.gains(Math.max(0, this.level))){
            stat(unit.stats).add(this.#key, new Add(amount))
        }
    }

    #clear(): void {
        const unit = this.#unit
        if(!unit) return
        for(const { stat } of this.gains(0)) stat(unit.stats).remove(this.#key)
    }
}
