import type { Text } from "../../../../semantic"
import { Scope } from "../../../../lifetime"
import type { Kept } from "../../../../lifetime"
import type { UnitContext } from "../battle/Action"

import type { Status, StatusType } from "./Status"

/** A status holding its level, written as its kind and its level by default. */
export abstract class BaseStatus implements Status {


    public abstract readonly type: StatusType

    constructor(
        /** What is left of it, or how much it stacked. */
        public level: number,
    ){}


    public onLevel: ((level: number) => void)|null = null

    public setLevel(level: number): void {
        this.level = level
        this.onLevel?.(level)
    }

    public toString(): string { return `${this.type} ${this.level}` }

    public toSemString(): Text { return [this.type, ` ${this.level}`] }

    public abstract init(ctx: UnitContext): void

    public abstract remove(ctx: UnitContext): void


    /**
     * Keep what the status listens with: it is taken back by {@link BaseStatus.letGo}, whatever the number of
     * times the status was initialized.
     */
    protected keep(...kept: Kept[]): void {
        this.#kept.track(...kept)
    }

    /** Take back everything kept: the status listens no more. */
    protected letGo(): void {
        this.#kept.remove()
        this.#kept = new Scope()
    }


    #kept = new Scope()
}
