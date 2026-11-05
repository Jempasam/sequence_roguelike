import type { Observer } from "../base/Observable"
import type { Rgba } from "../base/Rgba"
import type { Vector2 } from "../base/Vector2"

import type { Battle } from "./Battle"
import type { Unit } from "./Unit"

/** Where a unit stands and faces, as it does or as it would. A unit is one. */
export interface Pose {
    readonly position: Vector2

    /** Where it faces, a meter long. */
    readonly direction: Vector2
}

/** What an action runs with: the battle, and the unit it acts for. */
export interface UnitContext {
    readonly battle: Battle

    /** The unit acting, read when it acts: an action never keeps the unit it was built for. */
    readonly unit: Unit
}

/**
 * What something plugged into a unit for a while is given, an item: the unit and its battle, and where to
 * keep what it plugged in, its listeners and the ways to take its modifiers back, so the battle takes them
 * back when it is unplugged.
 */
export interface PlugContext extends UnitContext {
    /** Keep a listener, or a way to take something back, to be taken back when it is unplugged. */
    hold(held: Observer|(() => void)): void
}

/** What an action is previewed from: the battle as it stands, the unit, and where it would be by then. */
export interface PreviewContext {
    /** The battle, only read: the other units are where they stand now. */
    readonly battle: Battle

    readonly unit: Unit

    /** Where the unit would stand and face before the action, after the ones planned before it. */
    readonly pose: Pose
}

/** Something drawn over the arena to show what an action would do, its sizes in meters. */
export type Indicator =
    | { readonly kind: "label", readonly at: Vector2, readonly text: string, readonly color: Rgba }
    | {
        readonly kind: "arrow",

        /** The line, its head at the last point. */
        readonly points: readonly Vector2[],

        /** The width of the line, in meters. */
        readonly width: number,

        readonly color: Rgba,
    }
    | {
        readonly kind: "polygon",

        /** The outline, closed, its points in turn around a shape its first point sees whole. */
        readonly points: readonly Vector2[],

        readonly color: Rgba,
    }

/** What an action would do: what it shows, and where it would leave its unit. */
export interface Preview {
    readonly indicators: readonly Indicator[]

    /** Where the unit would stand and face after the action. */
    readonly pose: Pose

    /**
     * What the action sets going would do before each step after it, none when nothing: a horse carries its
     * rider ahead of each of its steps.
     */
    readonly beforeStep?: (ctx: PreviewContext) => Preview
}

/**
 * An action being played: each step of the generator is a tick of the simulation going by. What it shows
 * meanwhile, it posts to the battle as effects, with {@link Battle.post}: the battle plays a round out at
 * once, and the screen plays back what it told, in the time of the simulation.
 */
export type ActionRun = Generator<void, void, void>

/**
 * One step of a unit: what it does when its turn comes, over as many ticks as it takes, and what it would
 * do.
 *
 * @remarks
 * Both read their unit and where it stands from their context, never from the card it was built from: the
 * hypnosis plays an action for another unit, a clone goes on with the actions of its maker, and a preview
 * plays it from a pose the unit is not at yet. The two share their geometry, computed from a pose, so what
 * is shown is what is played, as long as nobody else moves meanwhile.
 *
 * What the action looks like while it plays is its own: a slash sweeps, a step walks. It posts it as
 * effects; the screen only plays back what the battle told.
 */
export interface Action {
    /** Play it for the unit of the context, one tick at each step of the run. */
    use(ctx: UnitContext): ActionRun

    /** What it would do from a pose, without touching the battle nor drawing any chance. */
    preview(ctx: PreviewContext): Preview
}
