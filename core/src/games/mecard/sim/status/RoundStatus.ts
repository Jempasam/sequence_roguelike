import type { Text } from "../../../../semantic"
import type { Observer } from "../base/Observable"
import { counted } from "../battle/words"
import type { UnitContext } from "../battle/Action"

import type { Status, StatusType } from "./Status"

/**
 * A status lasting a number of rounds, counted down at the end of each: what a potion puts on. A new one of
 * its kind adds its rounds, an antidote takes some off. Each says what it does while it lasts.
 */
export abstract class RoundStatus implements Status {


    public abstract readonly type: StatusType

    constructor(
        /** How many ends of round it still lasts for. */
        public rounds: number,
    ){}


    public toString(): string { return `${this.type} ${counted(this.rounds, "round")}` }

    public toSemString(): Text { return [this.type, ` ${counted(this.rounds, "round")}`] }

    // What it plugs in acts at the end of a round before the count down, plugged in first.
    public init(ctx: UnitContext): void {
        const { battle, unit } = ctx
        this.#plugged.push(...this.plug(ctx), battle.roundEnded.add(() => {
            this.rounds--
            if(this.rounds <= 0) battle.removeStatus(unit, this.type)
        }))
    }

    public remove(): void {
        for(const each of this.#plugged) each.remove()
        this.#plugged.length = 0
    }

    /** A new one of its kind adds its rounds. */
    public merge(incoming: Status): void {
        if(incoming instanceof RoundStatus && incoming.type === this.type) this.rounds += incoming.rounds
    }

    /** Take rounds off, and say whether nothing is left. */
    public shorten(rounds: number): boolean {
        this.rounds -= rounds
        return this.rounds <= 0
    }


    /** The same status, with the rounds it has left. */
    public abstract copy(): RoundStatus


    /**
     * Plug in what it does while it lasts, its observers and its modifiers, and give back what takes each
     * out: an observer, or for a modifier, what removes it.
     */
    protected abstract plug(ctx: UnitContext): Observer[]


    readonly #plugged: Observer[] = []
}
