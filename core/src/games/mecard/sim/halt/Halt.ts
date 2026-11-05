import type { Text } from "../../../../semantic"
import type { HaltContext } from "./HaltContext"
import type { HaltType } from "./HaltType"
import type { SceneLook } from "./SceneLook"

/**
 * A halt of the journey, as a place holds it: what it offers, drawn once when it is made, and whether the
 * party took anything from it yet.
 *
 * @remarks
 * A halt only says what it asks and what comes of it, through its {@link HaltContext}: nothing of it is
 * drawn here. What it looks like is told as data, its pictures being paths the interface loads, so a halt
 * runs the same with no interface at all.
 */
export interface Halt {
    /** The sort of halt it is. */
    readonly type: HaltType

    /** What it is called while it is visited. */
    readonly title: string

    /**
     * What its character says in its bubble when the party comes in: what the halt does, in its own words.
     * Short enough for a line, as a taller bubble leaves less room to the options under it. Where no
     * character stands, it is only told.
     */
    readonly line: Text

    /** The scene it is visited over. */
    readonly look: SceneLook

    /** Did it change the run yet? A halt left before that may be visited again, as it was. */
    readonly hasImpact: boolean

    /**
     * Open the visit, from its first dialog. It is called again when the party comes back, what the halt
     * offers staying the same.
     */
    start(ctx: HaltContext): void

    /**
     * Close the visit, however it ended. It cleans up after the halt and asks nothing more: the visit is
     * over, so a dialog opened here would never be answered.
     */
    stop(ctx: HaltContext): void
}
