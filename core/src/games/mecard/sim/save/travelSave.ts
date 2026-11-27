import type { Floor, FloorType } from "../floor/Floor"
import { EXIT_HALT } from "../halt/subs/ExitHalt"
import { ALL_FLOORS } from "../catalog/floors"
import { haltById } from "../catalog/halts"
import { fightTypeById } from "../catalog/fightTypes"
import { Journey } from "../run/Journey"
import type { Place } from "../run/Journey"
import type { Run } from "../run/Run"
import type { Travel } from "../travel/Travel"

import { Names } from "./catalogNames"

/**
 * The sorts of floor, found by the name a journey saved holds. Here and not with the other names, so a saved
 * battle does not load the floors.
 */
const FLOOR_NAMES = new Names<FloorType>("floor", ALL_FLOORS)

/** The version of the shape of a journey saved, raised when it changes, so an old one is refused clearly. */
export const TRAVEL_SAVE_VERSION = 3

/** A floor: the name of its sort, and its level. */
type SavedFloor = readonly [string, number]

/** A place of a map, its exits aside. */
export interface SavedPlace {
    /** The id of its fight, none when it holds none: the exits are not written down. */
    readonly fight: string|null

    /** The id of its halt, none when it holds none. */
    readonly halt: string|null
    readonly layer: number
    readonly across: number

    /** The places it leads to, by their rank on the map, the exits aside: laying them links them again. */
    readonly next: readonly number[]
}

/** The map of a floor. */
export interface SavedJourney {
    readonly scenery: number

    /** Its places, in the order they were laid, the exits aside: they are laid last, so the ranks stay. */
    readonly places: readonly SavedPlace[]

    /** The floors its exits lead to, from left to right. */
    readonly exits: readonly SavedFloor[]
}

/**
 * A journey on the map, written down as JSON: what {@link TravelState} holds, every floor and monster by its
 * name in the catalog, every place by its rank on the map.
 *
 * @remarks
 * The halts made so far are not written down, what they offer staying with the client that visits them: a
 * save for a viewer, who visits nothing. Keeping a run to go on with it later will take them.
 */
export interface TravelSave {
    readonly version: number
    readonly depth: number
    readonly floor: SavedFloor
    readonly journey: SavedJourney

    /** Where the party stands, by its rank on the map, none before the first place of the floor. */
    readonly place: number|null

    /** Which floor of the run it is, from 1: a save without it does not know. */
    readonly floorNumber?: number

    /** The places the party stood on, by their rank on the map, in order: a save without it has none. */
    readonly trail?: readonly number[]
}

/**
 * A journey written down, to read back with {@link loadTravel}.
 *
 * @throws {@link Error} Out of the map, or for a monster the catalog does not have.
 */
export function saveTravel(travel: Travel): TravelSave {
    const { floor, journey, place, depth, floorNumber, trail } = travel.state()
    return {
        version: TRAVEL_SAVE_VERSION, depth,
        floor: savedFloor(floor),
        journey: savedJourney(journey),
        place: place ? journey.places.indexOf(place) : null,
        ...floorNumber === null ? {} : { floorNumber },
        trail: trail.map(each => journey.places.indexOf(each)).filter(rank => rank >= 0),
    }
}

/**
 * Stand the journey of a run where a save has it.
 *
 * @returns That journey.
 * @throws {@link Error} When the save is of another version, or names something the catalog does not have.
 */
export function loadTravel(save: TravelSave, run: Run): Travel {
    if(save.version !== TRAVEL_SAVE_VERSION){
        throw new Error(`A journey save of version ${save.version} cannot be loaded by version ${TRAVEL_SAVE_VERSION}.`)
    }
    const journey = loadedJourney(save.journey, run)
    run.travel.restore({
        floor: loadedFloor(save.floor), journey, depth: save.depth,
        place: save.place === null ? null : placeAt(journey, save.place),
        floorNumber: save.floorNumber ?? null,
        trail: (save.trail ?? []).map(rank => placeAt(journey, rank)),
    })
    return run.travel
}

/**
 * The place of a rank on a map.
 *
 * @throws {@link Error} When the map has none there.
 */
export function placeAt(journey: Journey, rank: number): Place {
    const place = journey.places.at(rank)
    if(rank < 0 || !place) throw new Error(`The map has no place of rank ${rank}: the save is corrupted.`)
    return place
}


function savedFloor(floor: Floor): SavedFloor {
    return [floor.type.name, floor.level]
}

function loadedFloor([name, level]: SavedFloor): Floor {
    return FLOOR_NAMES.of(name).create(level)
}

function savedJourney(journey: Journey): SavedJourney {
    const { places, scenery, exits } = journey
    return {
        scenery,
        places: places.flatMap(place => {
            const { fight, halt, layer, across } = place
            if(place.exitTo) return []
            const next = place.next.filter(to => !to.exitTo).map(to => places.indexOf(to))
            return [{
                fight: fight?.id ?? null, halt: halt?.id ?? null, layer, across, next,
            }]
        }),
        exits: exits.map(savedFloor),
    }
}

/** A map laid again as its floor laid it: the places, their links, then the exits, which link themselves. */
function loadedJourney(save: SavedJourney, run: Run): Journey {
    const journey = new Journey(run.rng, save.scenery)
    const places = save.places.map(({ fight, halt, layer, across }) => {
        const at = { layer, across }
        const haltType = halt === null ? null : haltById(halt)
        if(fight === null){
            if(!haltType) throw new Error("A place holds a fight or a halt: the save is corrupted.")
            return journey.addHalt(haltType, at)
        }
        return journey.addFight(fightTypeById(fight), at, haltType)
    })
    save.places.forEach(({ next }, index) => {
        for(const rank of next) journey.link(places[index], placeAt(journey, rank))
    })
    journey.addExits(save.exits.map(loadedFloor), EXIT_HALT)
    return journey
}
