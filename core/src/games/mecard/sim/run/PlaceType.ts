import type { ImagePath, LayeredImagePath } from "../../../../engine/assets"
import type { Rgba } from "../base/Rgba"
import type { HaltType } from "../halt/HaltType"

import type { PlaceInfo } from "./Journey"

/**
 * A sort of place, one value for each: what the players are told of it, and how the map shows it. The places
 * of a journey point to their sort; none is told apart by a name, whose only use is to write them down.
 *
 * @remarks
 * Its pictures are paths, which nothing here reads: only an interface loads them, so the simulation runs
 * without any.
 */
export interface PlaceType extends PlaceInfo {
    /** What names it in a save or a command, never shown. Two sorts never share one. */
    readonly id: string

    /** The code of two letters at most shown on the map while its icon is not loaded, or there is none. */
    readonly code: string

    /** The picture of its token on the map, drawn small, none for a fight. */
    readonly icon: ImagePath|null

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
