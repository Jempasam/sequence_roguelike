import { enemyOfMap } from "../../trip/Cast"
import { enter, leave, oneOf } from "../../trip/Itinerary"
import { fightsWhere } from "../../trip/places"
import { WALKER } from "../../trip/Traveler"
import { tripEffect } from "../../trip/tripEffect"

/** A monster of a fight leaves the screen, or comes into it from outside to a fight. */
export const MONSTER_PASSING = tripEffect({
    id: "monster-passing",
    itinerary: oneOf(leave(fightsWhere()), enter(fightsWhere())),
    cast: enemyOfMap,
    traveler: WALKER,
    spacing: 20,
    weight: 3,
})
