import type { Monster } from "../catalog/monsters"
import type { Floor } from "../floor/Floor"
import { EXIT_HALT } from "../halt/subs/ExitHalt"
import { placeTypeById } from "../catalog/places"
import { Journey } from "../run/Journey"
import type { Place } from "../run/Journey"
import { isHalt } from "../run/PlaceType"
import type { FightType } from "../run/PlaceType"
import type { Run } from "../run/Run"
import type { Travel } from "../travel/Travel"

import { FLOOR_NAMES, MONSTER_NAMES } from "./catalogNames"

/** The version of the shape of a journey saved, raised when it changes, so an old one is refused clearly. */
export const TRAVEL_SAVE_VERSION = 1

/** A floor: the name of its sort, and its level. */
type SavedFloor = readonly [string, number]

/** A place of a map, its exits aside. */
export interface SavedPlace {
    /** The id of its sort of place, an exit's apart: the exits are not written down. */
    readonly kind: string
    readonly layer: number
    readonly across: number

    /** The places it leads to, by their rank on the map, the exits aside: laying them links them again. */
    readonly next: readonly number[]

    /** The monsters of its fight, by name. */
    readonly monsters: readonly string[]
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
}

/**
 * A journey written down, to read back with {@link loadTravel}.
 *
 * @throws {@link Error} Out of the map, or for a monster the catalog does not have.
 */
export function saveTravel(travel: Travel): TravelSave {
    const { floor, journey, place, depth } = travel.state()
    return {
        version: TRAVEL_SAVE_VERSION, depth,
        floor: savedFloor(floor),
        journey: savedJourney(journey),
        place: place ? journey.places.indexOf(place) : null,
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

/** @throws {@link Error} For a monster out of the catalog. */
function savedMonster(monster: Monster): string {
    if(!MONSTER_NAMES.has(monster)) throw new Error(`${monster.name} is not in the catalog: it cannot be saved.`)
    return monster.name
}

function savedJourney(journey: Journey): SavedJourney {
    const { places, scenery, exits } = journey
    return {
        scenery,
        places: places.flatMap(place => {
            const { type, layer, across } = place
            if(place.exitTo) return []
            const next = place.next.filter(to => !to.exitTo).map(to => places.indexOf(to))
            return [{ kind: type.id, layer, across, next, monsters: place.monsters.map(savedMonster) }]
        }),
        exits: exits.map(savedFloor),
    }
}

/** A map laid again as its floor laid it: the places, their links, then the exits, which link themselves. */
function loadedJourney(save: SavedJourney, run: Run): Journey {
    const journey = new Journey(run.rng, save.scenery)
    const places = save.places.map(({ kind, layer, across, monsters }) => {
        const at = { layer, across }
        const type = placeTypeById(kind)
        if(isHalt(type)) return journey.addHalt(type, at)
        return journey.addFight(type as FightType, monsters.map(name => MONSTER_NAMES.of(name)), at)
    })
    save.places.forEach(({ next }, index) => {
        for(const rank of next) journey.link(places[index], placeAt(journey, rank))
    })
    journey.addExits(save.exits.map(loadedFloor), EXIT_HALT)
    return journey
}
