import type { Visual } from "../base/Visual"
import type { PlaceType } from "../run/PlaceType"
import type { Run } from "../run/Run"

import type { Halt } from "./Halt"

/**
 * A sort of halt, one value for each: what the map tells of it, and how a halt of the sort is made.
 *
 * @remarks
 * Its pictures are visuals, keys that nothing here resolves: only an interface loads them, so the simulation runs
 * without any.
 */
export interface HaltType extends PlaceType {
    /** The picture of its token on the map. */
    readonly icon: Visual

    /** Make a halt of this sort for a run, what it offers drawn from the random numbers of the run. */
    create(run: Run): Halt
}
