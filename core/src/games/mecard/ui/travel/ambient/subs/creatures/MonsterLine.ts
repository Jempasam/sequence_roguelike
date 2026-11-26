import { manyOfFights } from "../../trip/Cast"
import { crossing, oneOf, swap, when } from "../../trip/Itinerary"
import { fightsWhere } from "../../trip/places"
import { WALKER } from "../../trip/Traveler"
import { tripEffect } from "../../trip/tripEffect"

/** A line of three to five monsters walks one behind the other, from edge to edge or fight to fight. */
export const MONSTER_LINE = tripEffect({
    id: "monster-line",
    itinerary: when(context => fightsWhere()(context).length >= 2, oneOf(swap(fightsWhere()), crossing())),
    cast: manyOfFights(3, 5),
    traveler: WALKER,
    spacing: 30,
    weight: 2,
})
