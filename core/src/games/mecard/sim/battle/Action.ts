import type { Observer } from "../base/Observable"
import type { Vector2 } from "../base/Vector2"

import type { Battle } from "./Battle"
import type { Previewable } from "./preview/Previewable"
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

/**
 * One step of a unit: what it does when its turn comes, all at once, and what it would do.
 *
 * @remarks
 * Both read their unit and where it stands from their context, never from the card it was built from: the
 * hypnosis plays an action for another unit, a clone goes on with the actions of its maker, and a preview
 * plays it from a pose the unit is not at yet. The two share their geometry, computed from a pose, so what
 * is shown is what is played, as long as nobody else moves meanwhile.
 *
 * There is no time in the simulation: an action is over when {@link Action.use} returns. What it looks like
 * is its own, a slash sweeps, a step walks, and it tells it with the signals and effects it posts to the
 * battle ({@link Battle.post}), each carrying how long it lasts; the screen only plays back what the battle
 * told, one thing after the other.
 */
export interface Action extends Previewable {
    /** Play it for the unit of the context, from start to end. */
    use(ctx: UnitContext): void
}
