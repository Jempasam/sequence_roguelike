import type { LayeredImagePath } from "../../../../engine/assets"
import { allPlaceTypes } from "../../sim/catalog/places"

/**
 * The transitions of the places, each once, by the name of its file: `door` for `…/door.ora`.
 *
 * @remarks
 * A function, not a value, for it is asked once the catalog is read, which a command may come first to.
 */
export function placeTransitions(): ReadonlyMap<string, LayeredImagePath> {
    return new Map(allPlaceTypes().map(({ transition }) => {
        return [transition.replace(/^.*\//, "").replace(/\.ora$/, ""), transition]
    }))
}
