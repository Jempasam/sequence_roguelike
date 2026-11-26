import type { Frame } from "../space/Frame"
import type { Level, Rgb } from "./Level"
import type { Address } from "./Pose"

/** What a level shows of what it holds: an element, placed in its own space. */
export interface Landmark {

    /** The level of the element. */
    readonly level: Level

    /** The element, as its level addresses it. */
    readonly at: Address

    /** Where the element lies in the space of the level that holds it. */
    readonly frame: Frame

    /** The main color of the element seen from afar. */
    readonly color: Rgb

    /** How much light it gives out, from 0. */
    readonly glow: number
}

/** The element of a level that a position is nearest to, and the level it belongs to. */
export interface Choice {
    readonly level: Level
    readonly at: Address
}
