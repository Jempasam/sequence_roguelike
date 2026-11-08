import type { LayeredImagePath } from "../../../../engine/assets"
import type { Visual } from "../base/Visual"
import type { Rgba } from "../base/Rgba"
import type { HaltType } from "../halt/HaltType"

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

    /** The painting of the transition entering it, read as `Transition` reads it. */
    readonly transition: LayeredImagePath
}

/** A sort of place holding a fight: the monsters are the place's own, and how rich it pays is the sort's. */
export interface FightType extends PlaceType {
    /** How much gold a won fight gives, and how much more at random up to a spread the run knows. */
    readonly gold: number
}

/** Is a sort of place a halt, visited rather than fought? A halt is the one that makes visits. */
export function isHalt(type: PlaceType): type is HaltType {
    return "create" in type
}
