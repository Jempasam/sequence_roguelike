import { visual } from "../../../../../sim"
import { optional } from "../../trip/Cast"
import { crossing, enter, leave, oneOf, swap } from "../../trip/Itinerary"
import { everywhere } from "../../trip/places"
import { PRINTS } from "../../trip/Traveler"
import { tripEffect } from "../../trip/tripEffect"

/** Footprints appear one by one along a way from a place or a side of the screen to another, then fade. */
export const FOOTPRINTS = tripEffect({
    id: "footprints",
    itinerary: oneOf(swap(everywhere), leave(everywhere), enter(everywhere), crossing()),
    cast: optional(visual("units/footprint")),
    traveler: PRINTS,
    spacing: 20,
    weight: 2,
})
