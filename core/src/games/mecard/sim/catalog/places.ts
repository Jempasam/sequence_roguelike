import type { Place, PlaceInfo } from "../run/Journey"
import type { PlaceType } from "../run/PlaceType"

import { FIGHTS } from "./fights"
import { allHalts } from "./halts"

/**
 * Every sort of place: the fights, then the halts.
 *
 * @remarks
 * A function, not a value: the halts reach the saves, which reach this, while the halts are still being read.
 */
export function allPlaceTypes(): readonly PlaceType[] {
    return [...FIGHTS, ...allHalts()]
}

/**
 * The sort of place with an id, from a save or a command.
 *
 * @throws {@link Error} When the catalog has none.
 */
export function placeTypeById(id: string): PlaceType {
    const type = allPlaceTypes().find(each => each.id === id)
    if(!type) throw new Error(`The catalog has no place "${id}".`)
    return type
}

/** What the players are told of a place: of the floor it leads to for an exit, else of its sort. */
export function infoOf(place: Place): PlaceInfo {
    return place.exitTo?.type ?? place.type
}
