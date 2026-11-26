import { ALL_MONSTERS, FISHER_KIT, visual } from "../../../../../sim"
import type { AmbientEffect } from "../../AmbientEffect"
import { HARBOR_FLOORS } from "../../themes"
import { fixed, manyOf, party } from "../../trip/Cast"
import { crossing } from "../../trip/Itinerary"
import { straight } from "../../trip/Route"
import { BOAT, CREWED_BOAT, WALKER } from "../../trip/Traveler"
import { tripEffect } from "../../trip/tripEffect"

/** A creature of the monsters crosses the screen from an edge to another one. */
export const EDGE_TO_EDGE: AmbientEffect = tripEffect({
    id: "edge-to-edge",
    itinerary: crossing(),
    cast: manyOf(ALL_MONSTERS.map(each => each.sprite), 1),
    traveler: WALKER,
    spacing: 20,
    weight: 2,
})

/** A boat comes into the screen by any edge and goes out by another, rocking on the sea. */
export const BOAT_CROSSING: AmbientEffect = tripEffect({
    id: "boat",
    itinerary: crossing({ route: straight }),
    cast: fixed(visual("units/ship")),
    traveler: BOAT,
    spacing: 30,
    weight: 3,
    floors: HARBOR_FLOORS,
})

/** The same boat, a fisher standing on it. */
export const FISHER_BOAT_CROSSING: AmbientEffect = tripEffect({
    id: "boat-fisher",
    itinerary: crossing({ route: straight }),
    cast: party(fixed(visual("units/ship")), fixed(FISHER_KIT.sprite)),
    traveler: CREWED_BOAT,
    spacing: 30,
    weight: 2,
    floors: HARBOR_FLOORS,
})
