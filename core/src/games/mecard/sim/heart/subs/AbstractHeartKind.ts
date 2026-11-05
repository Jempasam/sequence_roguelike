import type { Text } from "../../../../../semantic"
import { colored } from "../../base/Rgba"
import type { Rgba } from "../../base/Rgba"
import type { HeartRule } from "../HeartRule"
import type { HeartKind } from "../HeartKind"

/** What every kind of heart shares: what it is, where it stands, and telling itself in its color. */
export abstract class AbstractHeartKind implements HeartKind {


    constructor(
        public readonly name: string,

        /** What it does, in one sentence, for the player. */
        public readonly description: Text,

        /** The color it is drawn in, and named in unless too dark to read. */
        public readonly color: Rgba,

        /** Is it a heart of the base life, on the left of a bar, under the other kinds? No by default. */
        public readonly base = false,
    ){}


    public abstract create(): HeartRule

    public toString(): string { return this.name }

    public toSemString(): Text { return colored(this.color, this.name) }
}
