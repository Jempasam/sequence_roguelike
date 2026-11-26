import { ALL_KITS, ALL_MONSTERS, TAVERN_HALT } from "../../../../../sim"
import type { HaltType } from "../../../../../sim"
import type { AmbientContext } from "../../AmbientContext"
import type { AmbientEffect } from "../../AmbientEffect"
import { MONSTER_HALTS } from "../../themes"
import { manyOf, manyOfFights } from "../../trip/Cast"
import type { Cast } from "../../trip/Cast"
import { crossing, enter, leave, oneOf, swap, when } from "../../trip/Itinerary"
import type { Itinerary } from "../../trip/Itinerary"
import { everywhere, fightsWhere, haltsAmong } from "../../trip/places"
import { COMPANY, WALKER } from "../../trip/Traveler"
import { tripEffect } from "../../trip/tripEffect"
import { ENEMY_PLACES } from "./families"

/** Whether the map holds a fight, whose monsters and kits a line is made of. */
const HAS_FIGHT = (context: AmbientContext): boolean => fightsWhere()(context).length > 0

/** The effects of groups of one to four that come to some halts, leave them, and go from one to another. */
function partyEffects(name: string, halts: readonly HaltType[], cast: Cast): AmbientEffect[] {
    const places = haltsAmong(halts)
    const itineraries: readonly [string, Itinerary][] = [
        ["between", swap(places)],
        ["in", enter(places)],
        ["out", oneOf(leave(places), swap(places, everywhere))],
    ]
    return itineraries.map(([way, itinerary]) => tripEffect({
        id: `${name}-${way}`, itinerary, cast, traveler: COMPANY, spacing: 20, weight: 3,
    }))
}

/** The effects of lines of monsters and kits of the map, from a place to another or across the screen. */
function queueEffects(): AmbientEffect[] {
    const itineraries: readonly [string, Itinerary][] = [
        ["between", swap(ENEMY_PLACES)],
        ["edge-to-edge", crossing()],
        ["enter", enter(ENEMY_PLACES)],
        ["leave", leave(ENEMY_PLACES)],
    ]
    return itineraries.map(([way, itinerary]) => tripEffect({
        id: `enemy-queue-${way}`,
        itinerary: when(HAS_FIGHT, itinerary),
        cast: manyOfFights(3, 5),
        traveler: WALKER,
        spacing: 30,
        weight: 2,
    }))
}

/** Lines of the monsters and the kits of the map: `enemy-queue-*`. */
export const ENEMY_QUEUES: readonly AmbientEffect[] = queueEffects()

/** Groups of kits at the tavern: `tavern-party-*`. */
export const TAVERN_PARTIES: readonly AmbientEffect[] = partyEffects(
    "tavern-party", [TAVERN_HALT], manyOf(ALL_KITS.map(each => each.sprite), 1, 4),
)

/** Groups of monsters of the catalog at the halts that work with monsters: `all-monster-party-*`. */
export const ALL_MONSTER_PARTIES: readonly AmbientEffect[] = partyEffects(
    "all-monster-party", MONSTER_HALTS, manyOf(ALL_MONSTERS.map(each => each.sprite), 1, 4),
)
