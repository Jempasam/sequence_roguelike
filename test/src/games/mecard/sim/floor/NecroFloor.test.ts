import {
    BATTLE_REWARD_HALT, CAVE_FLOOR, DUEL_HALT, DuelHalt, exitsOf, Journey, NECRO_FLOOR,
    NECRO_RECRUIT_HALT, necroHalts, Rng, Run,
} from "@game/core/mecard"
import { DuelConversion, setUpNecro } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

describe("the floor of a necromancer", () => {
    test("filled → no fight, only halts of its own pool", () => {
        const journey = new Journey(new Rng(3))
        NECRO_FLOOR.create(1).fillMap(journey)
        const pool = necroHalts()
        expect(journey.places.length).toBeGreaterThan(0)
        for(const place of journey.places){
            expect(place.fight).toBeNull()
            expect(pool).toContain(place.halt)
        }
    })

    test("its exits → the same floor, a level higher, for ever", () => {
        const floor = NECRO_FLOOR.create(1)
        const [next] = exitsOf(floor)
        expect(exitsOf(floor)).toHaveLength(1)
        expect(next.type).toBe(NECRO_FLOOR)
        expect(next.level).toBe(2)
    })

    test("a run set up as a necromancer's → no hero, and recruiters where the taverns were", () => {
        const run = new Run(1, undefined, NECRO_FLOOR)
        setUpNecro(run)
        expect(run.heroes).toHaveLength(0)
        const first = run.travel.journey.places.filter(place => place.layer < 3)
        expect(first.length).toBeGreaterThan(0)
        expect(first.every(place => place.halt === NECRO_RECRUIT_HALT)).toBe(true)
    })
})

describe("the duels of a hero", () => {
    test("converted → no fight is left on any floor, each a halt of the duels", () => {
        const run = new Run(5)
        const conversion = new DuelConversion(run)
        const fought = (): number => run.travel.journey.places.filter(place => place.fight !== null).length
        expect(fought()).toBe(0)
        expect(run.travel.journey.places.some(place => place.halt === DUEL_HALT)).toBe(true)
        run.travel.enterFloor(CAVE_FLOOR.create(2))
        expect(fought()).toBe(0)
        conversion.dispose()
    })

    test("a duel won → its halt pays what it is given, once it is visited or before", () => {
        const run = new Run(2)
        const halt = DUEL_HALT.create(run) as DuelHalt
        const gold = run.gold
        halt.win(BATTLE_REWARD_HALT.create(run))
        expect(halt.hasImpact).toBe(true)
        expect(run.gold).toBe(gold)
    })
})
