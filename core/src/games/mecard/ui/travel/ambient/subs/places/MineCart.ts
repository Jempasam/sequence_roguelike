import { visual } from "../../../../../sim/base/Visual"
import { GOBLIN } from "../../../../../sim/catalog/monsters"
import { MINE_FLOORS } from "../../themes"
import { firstLoaded, fixed, party } from "../../trip/Cast"
import { crossing } from "../../trip/Itinerary"
import { straight } from "../../trip/Route"
import { MINE_CART as MINE_CART_TRAVELER } from "../../trip/Traveler"
import { tripEffect } from "../../trip/tripEffect"

/** A mine cart rattles across the map from any edge to another, a goblin pushing it, sparks flying from its wheels. */
export const MINE_CART = tripEffect({
    id: "mine-cart",
    category: "signature",
    itinerary: crossing({ route: straight }),
    cast: party(firstLoaded(visual("floors/mine/cart")), fixed(GOBLIN.sprite)),
    traveler: MINE_CART_TRAVELER,
    spacing: 8,
    weight: 4,
    floors: MINE_FLOORS,
})
