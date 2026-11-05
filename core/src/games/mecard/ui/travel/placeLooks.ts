import type { ImagePath, LayeredImagePath } from "../../../../engine/assets"
import { HALT_TYPES } from "../../sim/catalog/halts"
import { CAVE_TRANSITION } from "../../sim/halt/transitions"
import type { PlaceKind } from "../../sim/run/Journey"

/**
 * How a kind of place is shown: on the map, its icon alone or, for a fight or while the icon is not
 * loaded, a code of two letters at most; and the transition played as the party enters it.
 */
export interface PlaceLook {
    readonly code: string

    /** The picture on its token, drawn small, none for a fight. */
    readonly icon: ImagePath|null

    /** The painting of the transition entering the place, read as `Transition` reads it. */
    readonly transition: LayeredImagePath
}

/** How each kind of place is shown: the fights here, a halt by its sort. */
export const PLACE_LOOKS: Readonly<Record<PlaceKind, PlaceLook>> = {
    battle: { code: "C", icon: null, transition: CAVE_TRANSITION },
    elite: { code: "É", icon: null, transition: CAVE_TRANSITION },
    boss: { code: "B", icon: null, transition: CAVE_TRANSITION },
    ...HALT_TYPES,
}

/** The transitions of the places, each once, by the name of its file: `door` for `…/door.ora`. */
export const PLACE_TRANSITIONS: ReadonlyMap<string, LayeredImagePath> = new Map(
    Object.values(PLACE_LOOKS).map(({ transition }) => {
        return [transition.replace(/^.*\//, "").replace(/\.ora$/, ""), transition]
    }),
)
