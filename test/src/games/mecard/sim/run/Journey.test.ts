import { describe, expect, test } from "vitest"
import { CAVE_FLOOR, FOREST_FLOOR, GOBLIN, Journey, LAYERS, MINE_FLOOR, Rng, zipped } from "@game/core/mecard"
import type { Place } from "@game/core/mecard"

// --- Fixture builders ---

/** The journeys of a few seeds. */
function journeys(): Journey[] {
    const exits = [FOREST_FLOOR.create(2), MINE_FLOOR.create(2)]
    return [1, 2, 3, 4, 5, 6, 7, 8].map(seed => {
        const journey = new Journey(new Rng(seed))
        CAVE_FLOOR.create(1).fillMap(journey)
        journey.addExits(exits)
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
            expect(journey.layers[0].every(place => place.kind === "battle")).toBe(true)
            expect(journey.layers[LAYERS - 2].every(place => place.kind === "hospital")).toBe(true)
            expect(journey.layers[LAYERS - 1].map(place => place.kind)).toEqual(["boss"])
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
                    if(place.kind === "battle") continue
                    expect(leadingTo(journey, place).map(each => each.kind)).not.toContain(place.kind)
                }
            }
        }
    })

    test("any seed → no shop on the second layer, no elite before the fifth", () => {
        for(const journey of journeys()){
            expect(journey.layers[1].map(place => place.kind)).not.toContain("shop")
            const early = journey.layers.slice(0, 4).flat().map(place => place.kind)
            expect(early).not.toContain("elite")
        }
    })

    test("any seed → monsters on every fight, none on a halt", () => {
        for(const journey of journeys()){
            for(const place of journey.places){
                const fight = ["battle", "elite", "boss"].includes(place.kind)
                expect(place.monsters.length > 0).toBe(fight)
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
        const first = map.addHalt("shop", { layer: 3, across: 0.2 })
        const second = map.addHalt("forge", { layer: 0, across: 0.9 })
        const third = map.addFight("battle", [GOBLIN], { layer: 1, across: 0.5 })
        map.link(first, third)
        map.link(second, first)
        expect(map.entries).toEqual([second])
        expect(map.nextOf(null)).toEqual([second])
    })

    test("a fight laid → holds its monsters", () => {
        const fight = emptyMap().addFight("elite", [GOBLIN], { layer: 0, across: 0.5 })
        expect(fight.monsters).toEqual([GOBLIN])
    })

    test("several places leading nowhere → each leads to every exit", () => {
        const map = emptyMap()
        const ends = [0.25, 0.75].map(across => map.addHalt("shop", { layer: 0, across }))
        const floors = [FOREST_FLOOR.create(2), MINE_FLOOR.create(2)]
        map.addExits(floors)
        const exits = map.layers[1]
        expect(exits.map(exit => exit.exitTo)).toEqual(floors)
        for(const end of ends) expect(end.next).toEqual(exits)
    })

    test("from an exit → the other exits", () => {
        const map = emptyMap()
        map.addHalt("shop", { layer: 0, across: 0.5 })
        map.addExits([FOREST_FLOOR.create(2), MINE_FLOOR.create(2)])
        const [left, right] = map.layers[1]
        expect(map.nextOf(left)).toEqual([right])
    })

    test("a filled map changed afterwards → the new place is on the way", () => {
        const [journey] = journeys()
        const [start] = journey.entries
        const added = journey.addHalt("tavern", { layer: 1, across: 0.5 })
        journey.link(start, added)
        expect(journey.nextOf(start)).toContain(added)
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
