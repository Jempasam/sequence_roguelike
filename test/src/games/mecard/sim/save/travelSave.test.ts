import { describe, expect, test } from "vitest"
import { GOBLIN } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { BATTLE } from "@game/core-src/games/mecard/sim/fight/fights"
import { loadTravel, saveTravel, TRAVEL_SAVE_VERSION } from "@game/core-src/games/mecard/sim/save/travelSave"
import type { TravelSave } from "@game/core-src/games/mecard/sim/save/travelSave"
import type { Travel } from "@game/core-src/games/mecard/sim/travel/Travel"
import { fightOf } from "../../../../fixtures/fightFixtures"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** A journey read back into a new run. */
function reloaded(save: TravelSave): Travel {
    return loadTravel(JSON.parse(JSON.stringify(save)) as TravelSave, startedRun(99))
}

/** Stand the party on each next place, the first each time, a given number of times. */
function walk(travel: Travel, steps: number): void {
    for(let step = 0; step < steps; step++) travel.jump(travel.next[0])
}

// --- Tests ---

describe("saveTravel", () => {
    test.each([1, 2, 3, 4, 5])("the first map of seed %i → the same save once read back", seed => {
        const save = saveTravel(startedRun(seed).travel)
        expect(saveTravel(reloaded(save))).toEqual(save)
    })

    test("the party on its way → the same place, depth and ways on", () => {
        const { travel } = startedRun(7)
        walk(travel, 4)
        travel.depth = 5
        const loaded = reloaded(saveTravel(travel))
        expect(loaded.depth).toBe(5)
        const rank = (of: Travel, place: unknown): number => of.journey.places.indexOf(place as never)
        expect(rank(loaded, loaded.place)).toBe(rank(travel, travel.place))
        const ways = (of: Travel): number[] => of.next.map(place => rank(of, place))
        expect(ways(loaded)).toEqual(ways(travel))
    })

    test("a floor number and a trail → the same once read back, the trail by places", () => {
        const { travel } = startedRun(7)
        walk(travel, 3)
        travel.floorNumber = 4
        const loaded = reloaded(saveTravel(travel))
        expect(loaded.floorNumber).toBe(4)
        const ranks = (of: Travel): number[] => of.trail.map(place => of.journey.places.indexOf(place))
        expect(ranks(loaded)).toEqual(ranks(travel))
        expect(loaded.trail.length).toBe(3)
    })

    test("a save without a floor number → the floor of the run is not known", () => {
        const kept = Object.entries(saveTravel(startedRun(7).travel))
            .filter(([key]) => key !== "floorNumber" && key !== "trail")
        const loaded = reloaded(Object.fromEntries(kept) as unknown as TravelSave)
        expect(loaded.floorNumber).toBeNull()
        expect(loaded.trail).toEqual([])
    })

    test("a map read back → its links, fights and exits as they were", () => {
        const { travel } = startedRun(3)
        const loaded = reloaded(saveTravel(travel))
        const shape = ({ journey }: Travel) => journey.places.map(place => ({
            fight: place.fight?.id, halt: place.halt?.id, layer: place.layer, across: place.across,
            next: place.next.map(to => journey.places.indexOf(to)),
            exit: place.exitTo && [place.exitTo.type.name, place.exitTo.level],
        }))
        expect(shape(loaded)).toEqual(shape(travel))
        expect(loaded.journey.scenery).toBe(travel.journey.scenery)
        expect(loaded.floor.type).toBe(travel.floor.type)
    })

    test("a fight out of the catalog → refused on loading", () => {
        const { travel } = startedRun(3)
        const stranger = fightOf(BATTLE, GOBLIN)
        travel.journey.addFight(stranger, { layer: 0, across: 0.5 })
        expect(() => reloaded(saveTravel(travel))).toThrow(stranger.id)
    })

    test("out of the map → refused", () => {
        const { travel } = startedRun(3)
        travel.go(travel.next[0])
        expect(travel.phase).toBe("entering")
        expect(() => saveTravel(travel)).toThrow("entering")
    })

    test("a save of another version → refused", () => {
        const save = { ...saveTravel(startedRun(3).travel), version: TRAVEL_SAVE_VERSION + 1 }
        expect(() => reloaded(save)).toThrow("version")
    })
})
