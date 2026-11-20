import { describe, expect, test } from "vitest"
import {
    ALL_FIGHT_CATEGORIES, BATTLE, BOSS, CAVE_FLOOR, ELITE, EXIT_HALT, FOREST_FLOOR, FORGE_HALT, GOBLIN, HOSPITAL_HALT, Journey, LAYERS, MINE_FLOOR, Rng,
    SHOP_HALT, TAVERN_HALT, zipped,
} from "@game/core/mecard"
import type { FightCategory, Place, PlaceType } from "@game/core/mecard"
import { fightOf } from "../../../../fixtures/fightFixtures"

/** The sort of fight or of halt a place holds, the fight first. */
function typeOf(place: Place): PlaceType {
    return place.fight?.category ?? place.halt!
}

// --- Fixture builders ---

/** The journeys of a few seeds. */
function journeys(): Journey[] {
    const exits = [FOREST_FLOOR.create(2), MINE_FLOOR.create(2)]
    return [1, 2, 3, 4, 5, 6, 7, 8].map(seed => {
        const journey = new Journey(new Rng(seed))
        CAVE_FLOOR.create(1).fillMap(journey)
        journey.addExits(exits, EXIT_HALT)
        return journey
    })
}

/** An empty map. */
function emptyMap(): Journey {
    return new Journey(new Rng(1))
}

/** The places leading to a place, in the layer before it. */
function leadingTo(journey: Journey, place: Place): Place[] {
    return journey.layers[place.layer - 1]?.filter(each => each.next.includes(place)) ?? []
}

// --- Tests ---

describe("Journey", () => {
    test("any seed → the layers of an act, battles first, a hospital before the boss", () => {
        for(const journey of journeys()){
            expect(journey.layers).toHaveLength(LAYERS + 1)
            expect(journey.layers[0].every(place => typeOf(place) === BATTLE)).toBe(true)
            expect(journey.layers[LAYERS - 2].every(place => typeOf(place) === HOSPITAL_HALT)).toBe(true)
            expect(journey.layers[LAYERS - 1].map(place => typeOf(place))).toEqual([BOSS])
        }
    })

    test("any seed → every place reached and leading on, but the boss", () => {
        for(const journey of journeys()){
            for(const layer of journey.layers){
                for(const place of layer){
                    if(place.layer > 0) expect(leadingTo(journey, place).length).toBeGreaterThan(0)
                    if(place.layer < LAYERS) expect(place.next.length).toBeGreaterThan(0)
                }
            }
        }
    })

    test("any seed → no place but a battle of the kind of one leading to it", () => {
        for(const journey of journeys()){
            for(const layer of journey.layers.slice(1, LAYERS - 2)){
                for(const place of layer){
                    if(typeOf(place) === BATTLE) continue
                    expect(leadingTo(journey, place).map(each => typeOf(each))).not.toContain(typeOf(place))
                }
            }
        }
    })

    test("any seed → no shop on the second layer, no elite before the fifth", () => {
        for(const journey of journeys()){
            expect(journey.layers[1].map(place => typeOf(place))).not.toContain(SHOP_HALT)
            const early = journey.layers.slice(0, 4).flat().map(place => typeOf(place))
            expect(early).not.toContain(ELITE)
        }
    })

    test("any seed → a fight on every fight place, none on a halt", () => {
        for(const journey of journeys()){
            for(const place of journey.places){
                const fight = ALL_FIGHT_CATEGORIES.includes(typeOf(place) as FightCategory)
                expect(place.fight !== null).toBe(fight)
            }
        }
    })

    test("nextOf none → the first layer", () => {
        const [journey] = journeys()
        expect(journey.nextOf(null)).toEqual(journey.layers[0])
    })
})

describe("a free map", () => {
    test("places in no layers → the entries are those nothing leads to", () => {
        const map = emptyMap()
        const first = map.addHalt(SHOP_HALT, { layer: 3, across: 0.2 })
        const second = map.addHalt(FORGE_HALT, { layer: 0, across: 0.9 })
        const third = map.addFight(fightOf(BATTLE, GOBLIN), { layer: 1, across: 0.5 })
        map.link(first, third)
        map.link(second, first)
        expect(map.entries).toEqual([second])
        expect(map.nextOf(null)).toEqual([second])
    })

    test("a fight laid → holds its fight", () => {
        const type = fightOf(ELITE, GOBLIN)
        const fight = emptyMap().addFight(type, { layer: 0, across: 0.5 })
        expect(fight.fight).toBe(type)
    })

    test("several places leading nowhere → each leads to every exit", () => {
        const map = emptyMap()
        const ends = [0.25, 0.75].map(across => map.addHalt(SHOP_HALT, { layer: 0, across }))
        const floors = [FOREST_FLOOR.create(2), MINE_FLOOR.create(2)]
        map.addExits(floors, EXIT_HALT)
        const exits = map.layers[1]
        expect(exits.map(exit => exit.exitTo)).toEqual(floors)
        for(const end of ends) expect(end.next).toEqual(exits)
    })

    test("from an exit → the other exits", () => {
        const map = emptyMap()
        map.addHalt(SHOP_HALT, { layer: 0, across: 0.5 })
        map.addExits([FOREST_FLOOR.create(2), MINE_FLOOR.create(2)], EXIT_HALT)
        const [left, right] = map.layers[1]
        expect(map.nextOf(left)).toEqual([right])
    })

    test("a filled map changed afterwards → the new place is on the way", () => {
        const [journey] = journeys()
        const [start] = journey.entries
        const added = journey.addHalt(TAVERN_HALT, { layer: 1, across: 0.5 })
        journey.link(start, added)
        expect(journey.nextOf(start)).toContain(added)
    })
})

describe("Journey.insertLayer", () => {
    test("a row in the middle → a halt behind each place of the row before, leading where it led", () => {
        for(const journey of journeys()){
            const before = journey.layers
            const led = before[4].map(place => [...place.next])
            const laid = journey.insertLayer(FORGE_HALT, 5)
            const after = journey.layers
            expect(laid).toHaveLength(before[4].length)
            expect(after).toHaveLength(before.length + 1)
            expect(after[5]).toEqual(laid)
            expect(after[4]).toEqual(before[4])
            after[4].forEach((place, index) => {
                // One to one with the place before, and on from there as the place went on.
                expect(place.next).toEqual([laid[index]])
                expect(laid[index].next).toEqual(led[index])
                expect(laid[index].across).toBe(place.across)
            })
            for(const place of after[6]) expect(place.layer).toBe(6)
            expect(after[6]).toEqual(before[5])
        }
    })

    test("the first row → a way in in front of each place of it", () => {
        const journey = journeys()[0]
        const entries = journey.entries
        const laid = journey.insertLayer(TAVERN_HALT, 0)
        expect(journey.entries).toEqual(laid)
        expect(laid).toHaveLength(entries.length)
        laid.forEach((halt, index) => expect(halt.next).toEqual([entries[index]]))
    })

    test("past the last row of a map with exits → one behind each place of it, leading to the exits, which stay last", () => {
        const journey = journeys()[0]
        const rows = journey.layers.length - 1
        const exits = journey.layers[rows]
        const last = journey.layers[rows - 1]
        const laid = journey.insertLayer(FORGE_HALT, rows)
        expect(journey.layers[rows]).toEqual(laid)
        expect(journey.layers[rows + 1]).toEqual(exits)
        expect(laid).toHaveLength(last.length)
        for(const halt of laid) expect(halt.next).toEqual(exits)
        for(const place of last) expect(place.next).toHaveLength(1)
        expect(journey.places.slice(-exits.length)).toEqual(exits)
    })

    test("past the last row of a map with no exits → halts that lead nowhere", () => {
        const journey = emptyMap()
        const first = journey.addHalt(TAVERN_HALT, { layer: 0, across: 0.25 })
        const second = journey.addHalt(TAVERN_HALT, { layer: 0, across: 0.75 })
        const laid = journey.insertLayer(FORGE_HALT, 1)
        expect(laid).toHaveLength(2)
        expect(first.next).toEqual([laid[0]])
        expect(second.next).toEqual([laid[1]])
        for(const halt of laid) expect(halt.next).toEqual([])
    })

    test("a row the map has no room for → refused", () => {
        const journey = journeys()[0]
        expect(() => journey.insertLayer(FORGE_HALT, -1)).toThrow()
        expect(() => journey.insertLayer(FORGE_HALT, journey.layers.length)).toThrow()
    })
})

describe("zipped", () => {
    test("any widths → from the first to the last of both, no two links crossing", () => {
        for(const [from, to] of [[1, 3], [3, 1], [4, 2], [2, 4], [3, 3]]){
            const links = zipped(from, to, () => false)
            expect(links[0]).toEqual([0, 0])
            expect(links.at(-1)).toEqual([from - 1, to - 1])
            for(let i = 1; i < links.length; i++){
                expect(links[i][0]).toBeGreaterThanOrEqual(links[i - 1][0])
                expect(links[i][1]).toBeGreaterThanOrEqual(links[i - 1][1])
            }
        }
    })
})
