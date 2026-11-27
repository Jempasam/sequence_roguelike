import { describe, expect, test } from "vitest"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import {
    UPGRADE_FLOOR,
    upgradeFloorType,
    upgradeHalts,
} from "@game/core-src/games/mecard/sim/floor/subs/UpgradeFloor"
import { DUEL_HALT } from "@game/core-src/games/mecard/sim/halt/subs/duel/DuelHalt"
import { TAVERN_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/TavernHalt"
import { Journey } from "@game/core-src/games/mecard/sim/run/Journey"
import { Run } from "@game/core-src/games/mecard/sim/run/Run"

/** The map a floor of upgrades draws from a seed. */
function mapOf(seed: number, rows?: number): Journey {
    const journey = new Journey(new Rng(seed))
    const type = rows === undefined ? UPGRADE_FLOOR : upgradeFloorType(rows)
    type.create(1).fillMap(journey)
    return journey
}

describe("UpgradeFloor", () => {
    test("any seed → only halts that upgrade, no fight, no exit", () => {
        const allowed = new Set(upgradeHalts())
        for(let seed = 1; seed <= 20; seed++){
            const journey = mapOf(seed)
            expect(journey.places.length).toBeGreaterThan(0)
            for(const place of journey.places){
                expect(place.fight).toBeNull()
                expect(place.exitTo).toBeNull()
                expect(allowed.has(place.halt!)).toBe(true)
            }
        }
    })

    test("rows asked → that many rows, each of two to four places, the first of three at least", () => {
        for(const rows of [2, 5, 9]){
            const { layers } = mapOf(3, rows)
            expect(layers).toHaveLength(rows)
            layers.forEach((row, layer) => {
                expect(row.length).toBeGreaterThanOrEqual(layer === 0 ? 3 : 2)
                expect(row.length).toBeLessThanOrEqual(4)
            })
        }
    })

    test("any seed → every place reached and leading on, but the last row, and no place twice in a row on a path", () => {
        for(let seed = 1; seed <= 20; seed++){
            const journey = mapOf(seed)
            const { layers } = journey
            const reached = new Set(journey.places.flatMap(place => place.next))
            for(const place of journey.places){
                if(place.layer > 0) expect(reached.has(place)).toBe(true)
                if(place.layer < layers.length - 1) expect(place.next.length).toBeGreaterThan(0)
                for(const to of place.next) expect(to.halt).not.toBe(place.halt)
            }
        }
    })

    test("different seeds → different maps, and several paths from the first row to the last", () => {
        const signatures = new Set([1, 2, 3, 4, 5, 6].map(seed => {
            return mapOf(seed).layers.map(row => row.map(place => place.halt!.id).join(",")).join("|")
        }))
        expect(signatures.size).toBeGreaterThan(1)
        expect(mapOf(1).entries.length).toBeGreaterThan(1)
    })

    test("fewer than two rows → refused", () => {
        expect(() => upgradeFloorType(1).create(1)).toThrow()
    })

    test("a run started on it → the taverns first, then its rows, and nothing leads out of it", () => {
        const run = new Run(1, undefined, UPGRADE_FLOOR)
        const { layers, exits } = run.travel.journey
        expect(exits).toHaveLength(0)
        expect(layers[0].map(place => place.halt)).toEqual([TAVERN_HALT])
        expect(layers[1].map(place => place.halt)).toEqual([TAVERN_HALT])
        expect(layers).toHaveLength(3 + 5)
        expect(run.travel.floor.type).toBe(UPGRADE_FLOOR)
        expect(run.travel.journey.places.some(place => place.halt === DUEL_HALT)).toBe(false)
    })
})
