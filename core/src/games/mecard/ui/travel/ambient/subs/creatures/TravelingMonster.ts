import { enemyOfMap } from "../../trip/Cast"
import { swap } from "../../trip/Itinerary"
import { fightsWhere } from "../../trip/places"
import { WALKER } from "../../trip/Traveler"
import { tripEffect } from "../../trip/tripEffect"

/** A monster of a fight walks to another fight, in a zig-zag, leaving dust. */
export const TRAVELING_MONSTER = tripEffect({
    id: "traveling-monster",
    itinerary: swap(fightsWhere()),
    cast: enemyOfMap,
    traveler: WALKER,
    spacing: 20,
    weight: 3,
})
