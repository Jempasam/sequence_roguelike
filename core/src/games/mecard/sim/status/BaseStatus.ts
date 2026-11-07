import type { Text } from "../../../../semantic"
import type { UnitContext } from "../battle/Action"

import type { Status, StatusType } from "./Status"

/** A status holding its level, written as its kind and its level by default. */
export abstract class BaseStatus implements Status {


    public abstract readonly type: StatusType

    constructor(
        /** What is left of it, or how much it stacked. */
        public level: number,
    ){}


    public setLevel(level: number): void { this.level = level }

    public toString(): string { return `${this.type} ${this.level}` }

    public toSemString(): Text { return [this.type, ` ${this.level}`] }

    public abstract init(ctx: UnitContext): void

    public abstract remove(ctx: UnitContext): void
}
