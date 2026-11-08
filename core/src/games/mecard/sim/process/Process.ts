import type { Text } from "../../../../semantic"
import type { PlugContext, UnitContext } from "../battle/Action"
import type { Visual } from "../base/Visual"

/**
 * Something going on for a unit until the end of the round: a bonus to its strength, a horse carrying it.
 *
 * @remarks
 * A process is plugged in with {@link Battle.startProcess}, and keeps what it plugs in with `ctx.hold`: the
 * battle takes it all back at the end of the round, or when the unit dies, after {@link Process.dispose}.
 * Unlike a status, two processes never merge, and none is ever written down: a battle is only saved
 * between two rounds, when none is left.
 */
export interface Process {
    /** What it is called, `force`. */
    readonly name: string

    /** How its icon looks, and the color its name is written in. */
    readonly icon: Visual

    /** Its name, for the console and the log. */
    toString(): string

    /** Its name in its color, for the HUD. */
    toSemString(): Text

    /** Plug in what it does, each listener and modifier kept with `ctx.hold`. */
    init(ctx: PlugContext): void

    /** Do what it does as it ends, before what it kept is taken back. Nothing by default. */
    dispose?(ctx: UnitContext): void
}
