import { describe, expect, test } from "vitest"
import { freeHalts, lootHalts, Run, SHOP_HALT, TAVERN_HALT } from "@game/core/mecard"

describe("the start of a run", () => {

    test("a new run → nobody in the party", () => {
        expect(new Run(1).heroes).toEqual([])
    })

    test("a new run → a tavern, a free halt, a tavern, then the fights of the floor", () => {
        for(let seed = 0; seed < 30; seed++){
            const { layers, entries } = new Run(seed).travel.journey
            expect(entries.map(place => place.type)).toEqual([TAVERN_HALT])
            expect(layers[0].map(place => place.type)).toEqual([TAVERN_HALT])
            expect(layers[1]).toHaveLength(1)
            expect(freeHalts()).toContain(layers[1][0].type)
            expect(layers[1][0].type).not.toBe(SHOP_HALT)
            expect(layers[2].map(place => place.type)).toEqual([TAVERN_HALT])
            expect(layers[3].length).toBeGreaterThan(0)
            expect(layers[3].every(place => !("create" in place.type))).toBe(true)
        }
    })

    test("the way in → the exits stay the last row, and the first place is the only way in", () => {
        const { journey } = new Run(4).travel
        expect(journey.entries).toHaveLength(1)
        expect(journey.layers.at(-1)?.every(place => place.exitTo !== null)).toBe(true)
    })

    test("a party of none in the tavern → it cannot leave before hiring", () => {
        const run = new Run(1)
        const { travel } = run
        travel.go(travel.journey.entries[0])
        travel.enter()
        travel.leave()
        expect(travel.phase).toBe("visit")
        expect(run.heroes).toHaveLength(0)
    })
})

describe("free halts", () => {

    test("the halts that may be given → those a floor lays, but no shop", () => {
        expect(freeHalts().length).toBeGreaterThan(0)
        expect(freeHalts()).not.toContain(SHOP_HALT)
        for(const type of freeHalts()) expect(lootHalts()).toContain(type)
    })
})
