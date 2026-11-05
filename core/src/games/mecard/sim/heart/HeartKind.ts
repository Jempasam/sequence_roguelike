import type { Text } from "../../../../semantic"
import type { Rgba } from "../base/Rgba"

import type { HeartRule } from "./HeartRule"

/**
 * A kind of heart: what it is called and looks like, and the rules it plays by, made for each life bar
 * that holds hearts of the kind. One object of the catalog for each kind, compared by reference.
 */
export interface HeartKind {
    readonly name: string

    /** What it does, in one sentence, for the player. */
    readonly description: Text

    /** The color it is drawn in, and named in unless too dark to read. */
    readonly color: Rgba

    /**
     * Is it a heart of the base life, standing on the left of a bar, under the other kinds, which are lost
     * first? The red hearts are.
     */
    readonly base: boolean

    /** The rules of the kind for one life bar, made when a bar first holds a heart of the kind. */
    create(): HeartRule

    /** Its name. */
    toString(): string

    /** Its name in a color of its own. */
    toSemString(): Text
}
