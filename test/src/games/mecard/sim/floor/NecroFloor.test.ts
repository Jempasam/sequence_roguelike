import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { exitsOf } from "@game/core-src/games/mecard/sim/catalog/floors"
import { CAVE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/CaveFloor"
import { NECRO_FLOOR, necroHalts } from "@game/core-src/games/mecard/sim/floor/subs/NecroFloor"
import { DUEL_HALT, DuelHalt } from "@game/core-src/games/mecard/sim/halt/subs/duel/DuelHalt"
import { NECRO_RECRUIT_HALT } from "@game/core-src/games/mecard/sim/halt/subs/necro/NecroRecruitHalt"
import { BATTLE_REWARD_HALT } from "@game/core-src/games/mecard/sim/halt/subs/reward/BattleRewardHalt"
import { Journey } from "@game/core-src/games/mecard/sim/run/Journey"
import { Run } from "@game/core-src/games/mecard/sim/run/Run"
import { DuelConversion } from "@game/core-src/games/mecard/sim/mode/subs/monsterBuilder/DuelConversion"
import { setUpNecro } from "@game/core-src/games/mecard/sim/mode/subs/monsterBuilder/NecroSetup"
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
