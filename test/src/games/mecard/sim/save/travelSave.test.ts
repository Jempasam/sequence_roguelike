import { describe, expect, test } from "vitest"
import { BATTLE, GOBLIN, loadTravel, saveTravel, TRAVEL_SAVE_VERSION } from "@game/core/mecard"
import type { Monster, Travel, TravelSave } from "@game/core/mecard"
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

    test("a map read back → its links, monsters and exits as they were", () => {
        const { travel } = startedRun(3)
        const loaded = reloaded(saveTravel(travel))
        const shape = ({ journey }: Travel) => journey.places.map(place => ({
            kind: place.type.id, layer: place.layer, across: place.across,
            next: place.next.map(to => journey.places.indexOf(to)),
            monsters: place.monsters.map(monster => monster.name),
            exit: place.exitTo && [place.exitTo.type.name, place.exitTo.level],
        }))
        expect(shape(loaded)).toEqual(shape(travel))
        expect(loaded.journey.scenery).toBe(travel.journey.scenery)
        expect(loaded.floor.type).toBe(travel.floor.type)
    })

    test("a monster out of the catalog → refused", () => {
        const { travel } = startedRun(3)
        const stranger: Monster = { ...GOBLIN, name: "Inconnu" }
        travel.journey.addFight(BATTLE, [stranger], { layer: 0, across: 0.5 })
        expect(() => saveTravel(travel)).toThrow("Inconnu")
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
