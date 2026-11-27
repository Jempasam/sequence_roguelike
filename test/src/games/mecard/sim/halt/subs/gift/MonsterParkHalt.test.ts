import { describe, expect, test } from "vitest"
import {
    allHalts,
    darkHalts,
    greatHalts,
    haltById,
    lootHalts,
    masterHalts,
    modeHalts,
    rewardHalts,
    simpleHalts,
} from "@game/core-src/games/mecard/sim/catalog/halts"
import { MONSTER_PARK_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/MonsterParkHalt"

import { ScriptedPlayer } from "../../../../../../fixtures/haltFixtures"
import { startedRun } from "../../../../../../fixtures/startedRun"

// --- Tests ---

describe("MONSTER_PARK_HALT", () => {
    test("a sort of halt found by its id, and laid only by modes: no floor group holds it", () => {
        expect(haltById("monster-park")).toBe(MONSTER_PARK_HALT)
        expect(allHalts()).toContain(MONSTER_PARK_HALT)
        expect(modeHalts()).toContain(MONSTER_PARK_HALT)
        for(const group of [simpleHalts(), masterHalts(), greatHalts(), darkHalts(), lootHalts(), rewardHalts()]){
            expect(group).not.toContain(MONSTER_PARK_HALT)
        }
    })

    test("a monster picked → it joins the party, and the visit had an impact", () => {
        for(let seed = 1; seed < 20; seed++){
            const run = startedRun(seed)
            const heroes = run.heroes.length
            const halt = MONSTER_PARK_HALT.create(run)
            expect(halt.hasImpact).toBe(false)
            const player = new ScriptedPlayer(run)
            halt.start(player)
            player.play()
            expect(run.heroes).toHaveLength(heroes + 1)
            expect(halt.hasImpact).toBe(true)
        }
    })
})
