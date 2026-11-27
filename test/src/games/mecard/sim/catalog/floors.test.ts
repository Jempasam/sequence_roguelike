import { describe, expect, test } from "vitest"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { exitsOf, FIRST_FLOOR, FLOOR_LINKS, ALL_FLOORS } from "@game/core-src/games/mecard/sim/catalog/floors"
import { BOSS_MONSTERS } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { BATTLE, BOSS } from "@game/core-src/games/mecard/sim/fight/fights"
import { LAYERS } from "@game/core-src/games/mecard/sim/floor/subs/AbstractFloor"
import { CaveFloor } from "@game/core-src/games/mecard/sim/floor/subs/CaveFloor"
import { FORGE_HALT } from "@game/core-src/games/mecard/sim/halt/subs/deck/ForgeHalt"
import { EXIT_HALT } from "@game/core-src/games/mecard/sim/halt/subs/ExitHalt"
import { CHEST_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/ChestHalt"
import { TAVERN_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/TavernHalt"
import { HOSPITAL_HALT } from "@game/core-src/games/mecard/sim/halt/subs/party/HospitalHalt"
import { Journey } from "@game/core-src/games/mecard/sim/run/Journey"
import type { Monster } from "@game/core-src/games/mecard/sim/catalog/monsters"
import type { Floor, FloorType } from "@game/core-src/games/mecard/sim/floor/Floor"
import type { PlaceSort, PlaceWeights } from "@game/core-src/games/mecard/sim/floor/subs/AbstractFloor"
import type { Place } from "@game/core-src/games/mecard/sim/run/Journey"
import type { PlaceType } from "@game/core-src/games/mecard/sim/run/PlaceType"

/** The sort of fight or of halt a place holds: floors only lay a fight or a halt, not both. */
function typeOf(place: Place): PlaceType {
    return place.fight?.category ?? place.halt!
}

// --- Fixture builders ---

/** The sorts of floor a run may reach. */
function reachable(): Set<FloorType> {
    const reached = new Set<FloorType>([FIRST_FLOOR])
    for(const type of reached) for(const next of FLOOR_LINKS.get(type) ?? []) reached.add(next)
    return reached
}

/** The map a floor fills, its exits not laid. */
function mapOf(floor: Floor, seed = 1): Journey {
    const map = new Journey(new Rng(seed))
    floor.fillMap(map)
    return map
}

/** The monsters the fight of a place puts in the arena, on a floor. */
function monstersOf(place: Place, floor: Floor): Monster[] {
    const monsters: Monster[] = []
    place.fight!.populate({
        rng: new Rng(1), level: floor.level, layer: place.layer,
        add: monster => { monsters.push(monster) },
        addKit: () => {},
        addHero: () => {},
    })
    return monsters
}

/** A cave of only battles and forges. */
class ForgeCave extends CaveFloor {
    protected override weights(): PlaceWeights {
        return new Map<PlaceSort, number>([[BATTLE, 1], [FORGE_HALT, 1]])
    }
}

/** A cave with nothing but halts to draw. */
class HaltCave extends CaveFloor {
    protected override weights(): PlaceWeights {
        return new Map<PlaceSort, number>([[FORGE_HALT, 1], [CHEST_HALT, 1], [TAVERN_HALT, 1]])
    }
}

/** Does a place hold a halt, and no fight? */
function isHaltPlace(place: Place): boolean {
    return !place.fight
}

/** The most places alike a path of a map meets in a row. */
function longestRow(map: Journey, alike: (place: Place) => boolean): number {
    const rows = new Map<Place, number>()
    for(const place of map.places) rows.set(place, alike(place) ? 1 : 0)
    for(const place of map.places) for(const next of place.next){
        if(alike(next)) rows.set(next, Math.max(rows.get(next) ?? 0, (rows.get(place) ?? 0) + 1))
    }
    return Math.max(...rows.values())
}

/** The most halts a path of a map meets in a row. */
function longestHaltRow(map: Journey): number {
    return longestRow(map, place => isHaltPlace(place))
}

/** The most fights a path of a map meets in a row. */
function longestFightRow(map: Journey): number {
    return longestRow(map, place => !isHaltPlace(place))
}

// --- Tests ---

describe("FLOOR_LINKS", () => {
    test("every sort → reached from the first", () => {
        expect(reachable()).toEqual(new Set(ALL_FLOORS))
    })

    test.each(ALL_FLOORS.map(type => ({ name: type.name, type })))("$name → leads somewhere", ({ type }) => {
        expect(FLOOR_LINKS.get(type)?.length).toBeGreaterThan(0)
    })

    test("the exits of a floor → the floors linked, a level harder", () => {
        const exits = exitsOf(FIRST_FLOOR.create(3))
        expect(exits.map(floor => floor.type)).toEqual(FLOOR_LINKS.get(FIRST_FLOOR))
        expect(exits.every(floor => floor.level === 4)).toBe(true)
    })
})

describe.each(ALL_FLOORS.map(type => ({ name: type.name, type })))("$name", ({ type }) => {
    test("made at a level → of its sort, at that level", () => {
        const floor = type.create(5)
        expect(floor.type).toBe(type)
        expect(floor.level).toBe(5)
    })

    test("its boss → leads the monsters of a boss fight", () => {
        const place = mapOf(type.create(1)).places.find(each => typeOf(each) === BOSS)
        const [boss, ...others] = monstersOf(place!, type.create(1))
        expect(BOSS_MONSTERS).toContain(boss)
        expect(others.length).toBeGreaterThan(0)
        for(const other of others) expect(BOSS_MONSTERS).not.toContain(other)
    })

    test("its map → no exit of its own, they are not its to lay", () => {
        expect(mapOf(type.create(1)).places.map(place => typeOf(place))).not.toContain(EXIT_HALT)
    })

    test("its decorations → at least one, drawn at a whole size", () => {
        expect(type.decorations.length).toBeGreaterThan(0)
        for(const { size } of type.decorations) expect(Number.isInteger(size)).toBe(true)
    })
})

describe("a filled map", () => {
    test("an exit for each floor ahead, leading out to it", () => {
        const floor = FIRST_FLOOR.create(1)
        const exits = exitsOf(floor)
        const journey = mapOf(floor)
        journey.addExits(exits, EXIT_HALT)
        const last = journey.layers[LAYERS]
        expect(last.map(place => place.exitTo)).toEqual(exits)
        expect(last.every(place => typeOf(place) === EXIT_HALT)).toBe(true)
        expect(journey.layers[LAYERS - 1][0].next).toEqual(last)
    })

    test("a floor with its own weights → no other place but those it always lays", () => {
        const kinds = new Set(mapOf(new ForgeCave(1)).places.map(place => typeOf(place)))
        expect(kinds).toEqual(new Set([BATTLE, FORGE_HALT, HOSPITAL_HALT, BOSS]))
    })

    const types = ALL_FLOORS.map(type => ({ name: type.name, type }))

    test.each(types)("$name → no three halts in a row", ({ type }) => {
        for(let seed = 1; seed <= 200; seed++){
            expect(longestHaltRow(mapOf(type.create(1), seed))).toBeLessThan(3)
        }
    })

    test.each(types)("$name → no three fights in a row", ({ type }) => {
        for(let seed = 1; seed <= 200; seed++){
            expect(longestFightRow(mapOf(type.create(1), seed))).toBeLessThan(3)
        }
    })

    test.each(types)("$name → a halt is never of the kind of a place leading to it", ({ type }) => {
        for(let seed = 1; seed <= 200; seed++){
            for(const place of mapOf(type.create(1), seed).places) for(const next of place.next){
                if(isHaltPlace(place) && next.layer < LAYERS - 2) expect(typeOf(next)).not.toBe(typeOf(place))
            }
        }
    })

    test.each(types)("$name → the first layer stays battles, the last two their hospitals and boss", ({ type }) => {
        for(let seed = 1; seed <= 200; seed++){
            const { layers } = mapOf(type.create(1), seed)
            expect(layers[0].every(place => typeOf(place) === BATTLE)).toBe(true)
            expect(layers[LAYERS - 2].every(place => typeOf(place) === HOSPITAL_HALT)).toBe(true)
            expect(layers[LAYERS - 1].map(place => typeOf(place))).toEqual([BOSS])
        }
    })

    test("a floor of only battles and forges → no three alike in a row", () => {
        for(let seed = 1; seed <= 200; seed++){
            const map = mapOf(new ForgeCave(1), seed)
            expect(longestFightRow(map)).toBeLessThan(3)
            expect(longestHaltRow(map)).toBeLessThan(3)
        }
    })

    test("nothing but halts to draw → still no three in a row", () => {
        for(let seed = 1; seed <= 200; seed++){
            expect(longestHaltRow(mapOf(new HaltCave(1), seed))).toBeLessThan(3)
        }
    })

    test("a battle breaking halts → in their middle, the ends of a row stay halts", () => {
        for(let seed = 1; seed <= 200; seed++){
            const { layers } = mapOf(new HaltCave(1), seed)
            expect(layers[1].every(place => isHaltPlace(place))).toBe(true)
            expect(layers[LAYERS - 2].every(place => typeOf(place) === HOSPITAL_HALT)).toBe(true)
        }
    })

    test("a battle breaking halts → holds its monsters", () => {
        const fights = mapOf(new HaltCave(1)).places.filter(place => typeOf(place) === BATTLE)
        for(const fight of fights) expect(monstersOf(fight, new CaveFloor(1)).length).toBeGreaterThan(0)
    })
})
