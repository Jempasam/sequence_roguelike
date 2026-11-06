import type { ImagePath, LayeredImagePath } from "../../../../engine/assets"
import type { Rgba } from "../base/Rgba"
import type { PlaceInfo } from "../run/Journey"
import type { Run } from "../run/Run"

import type { Halt } from "./Halt"

/**
 * A sort of halt, one value for each: what the map tells of it, and how a halt of the sort is made.
 *
 * @remarks
 * Its pictures are paths, which nothing here reads: only an interface loads them, so the simulation runs
 * without any.
 */
export interface HaltType extends PlaceInfo {
    /** The code of two letters at most shown on the map while its icon is not loaded. */
    readonly code: string

    /** The picture of its token on the map. */
    readonly icon: ImagePath

    /** The color of a glow around its token on the map, none for no glow. */
    readonly glow?: Rgba

    /** The painting of the transition entering it, read as `Transition` reads it. */
    readonly transition: LayeredImagePath

    /** Make a halt of this sort for a run, what it offers drawn from the random numbers of the run. */
    create(run: Run): Halt
}
