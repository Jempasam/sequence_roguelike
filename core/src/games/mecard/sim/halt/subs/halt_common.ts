import { visual } from "../../base"
import { rgba } from "../../base/Rgba"
import type { PnjHatName, PnjMaskName } from "../PnjHats"

/** The gold of the masters: their glow and their clothes. */
export const MASTER_COLOR = rgba(1, 0.8, 0.2)

/** The mask of the masters. */
export const MASTER_MASK: PnjMaskName = "sunglasses"

/** The gold transtion of the masters */
export const MASTER_TRANSITION = visual("transitions/gilded-door",{coloration:[1,.8,.2]})


/** The blue of the great ones: their glow, their crown and what they carry. */
export const GREAT_COLOR = rgba(0.3, 0.6, 1)

/** The hat of the great ones. */
export const GREAT_HAT: PnjHatName = "hornedCrown"

/** The warm gold tint of the places of the great ones, for their scenes and transitions. */
export const GREAT_COLORATION: [number, number, number] = [1, 0.88, 0.62]


/** The violet of the dark ones, who deal in monsters: their glow, their clothes, and what they wear. */
export const DARK_COLOR = rgba(0.6, 0.25, 1)

/** The pale violet tint of the places of the dark ones, for their scenes and transitions. */
export const DARK_COLORATION: [number, number, number] = [0.72, 0.56, 0.78]

/** The mask of the dark ones. */
export const DARK_MASK: PnjMaskName = "skeleton"
