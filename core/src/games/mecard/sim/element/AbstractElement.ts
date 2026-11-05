import type { Text } from "../../../../semantic"
import { colored } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"
import type { Vector2 } from "../base/Vector2"
import type { UnitContext } from "../battle/Action"
import type { Unit } from "../battle/Unit"

import type { Element } from "./Element"

/** An element telling itself by its name, in its color. */
export abstract class AbstractElement implements Element {


    constructor(
        public readonly name: string,
        public readonly color: Rgba,
        public readonly word: string,
        public readonly negativeText: Text,
        public readonly positiveText: Text,
        public readonly invokedText: Text,
    ){}


    public toString(): string { return this.name }

    public toSemString(): Text { return colored(this.color, this.name) }

    public abstract applyNegative(ctx: UnitContext, target: Unit): void

    public abstract applyPositive(ctx: UnitContext, target: Unit): void

    public abstract invoke(ctx: UnitContext, at: Vector2, direction: Vector2, effect: Element): void
}
