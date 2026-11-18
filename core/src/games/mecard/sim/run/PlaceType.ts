import { visual } from "../base/Visual"
import type { Visual } from "../base/Visual"
import type { Rgba } from "../base/Rgba"

import type { PlaceInfo } from "./Journey"

/**
 * A sort of place, one value for each: what the players are told of it, and how the map shows it. The places
 * of a journey point to their sort; none is told apart by a name, whose only use is to write them down.
 *
 * @remarks
 * Its pictures are visuals, keys that nothing here resolves: only an interface loads them, so the simulation runs
 * without any.
 */
export interface PlaceType extends PlaceInfo {
    /** What names it in a save or a command, never shown. Two sorts never share one. */
    readonly id: string

    /**
     * How its token looks on the map, drawn small: its picture, and the letters of two at most that the map
     * writes in its stead where the picture is not loaded, or there is none, as for a fight.
     */
    readonly icon: Visual

    /** The color of a glow around its token on the map, none for no glow. */
    readonly glow?: Rgba

    /**
     * The transition entering it, such as `warm-door`: a name the screen resolves as it wishes. Its
     * coloration tints the transition, its color and description fill in where the screen has none.
     */
    readonly transition: Visual
}

/** The transition played on leaving a fight or a halt, back to the map: a name the screen resolves as it wishes. */
export const BACK_VISUAL = visual("back")
