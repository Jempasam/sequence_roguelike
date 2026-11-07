import type { Text } from "../../../../semantic"
import type { Observer } from "../base/Observable"
import { counted } from "../battle/words"
import type { UnitContext } from "../battle/Action"

import { BaseStatus } from "./BaseStatus"

/**
 * A status whose level is the rounds it lasts, one less at the end of each: what a potion puts on. A new one
 * of its kind adds its level, an antidote takes some off. Each says what it does while it lasts.
 */
export abstract class RoundStatus extends BaseStatus {


    public override toString(): string { return `${this.type} ${counted(this.level, "round")}` }

    public override toSemString(): Text { return [this.type, ` ${counted(this.level, "round")}`] }

    // What it plugs in acts at the end of a round before the count down, plugged in first.
    public init(ctx: UnitContext): void {
        const { battle, unit } = ctx
        this.#plugged.push(...this.plug(ctx), battle.roundEnded.add(() => {
            this.setLevel(this.level - 1)
            if(this.level <= 0) battle.removeStatus(unit, this.type)
        }))
    }

    public remove(): void {
        for(const each of this.#plugged) each.remove()
        this.#plugged.length = 0
    }


    /**
     * Plug in what it does while it lasts, its observers and its modifiers, and give back what takes each
     * out: an observer, or for a modifier, what removes it.
     */
    protected abstract plug(ctx: UnitContext): Observer[]


    readonly #plugged: Observer[] = []
}
