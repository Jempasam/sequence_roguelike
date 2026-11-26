import { GOBLIN, visual } from "../../../../../sim"
import { MINE_FLOORS } from "../../themes"
import { firstLoaded, fixed, party } from "../../trip/Cast"
import { crossing } from "../../trip/Itinerary"
import { straight } from "../../trip/Route"
import { MINE_CART as MINE_CART_TRAVELER } from "../../trip/Traveler"
import { tripEffect } from "../../trip/tripEffect"

/** A mine cart rattles across the bottom of the map, a goblin pushing it, sparks flying from its wheels. */
export const MINE_CART = tripEffect({
    id: "mine-cart",
    itinerary: crossing({ route: straight, band: [0.78, 0.9] }),
    cast: party(firstLoaded(visual("floors/mine/cart")), fixed(GOBLIN.sprite)),
    traveler: MINE_CART_TRAVELER,
    spacing: 20,
    weight: 4,
    floors: MINE_FLOORS,
})
