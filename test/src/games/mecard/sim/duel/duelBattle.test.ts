import { describe, expect, test } from "vitest"
import { duelSave, partyUnits } from "@game/core-src/games/mecard/sim/duel/duelBattle"
import { loadBattle } from "@game/core-src/games/mecard/sim/save/battleSave"
import type { DuelParty } from "@game/core-src/games/mecard/sim/duel/duelBattle"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** A player and the party of a run of its own. */
function party(name: string, seed: number): DuelParty {
    return { name, units: partyUnits(startedRun(seed)) }
}

// --- Tests ---

describe("partyUnits", () => {
    test("a run → one unit for each hero, in the order of the party, none touched in the run", () => {
        const run = startedRun(1)
        const before = JSON.stringify(run.save())
        const units = partyUnits(run)
        expect(units.map(unit => unit.name)).toEqual(run.heroes.map(hero => hero.name))
        expect(JSON.stringify(run.save())).toBe(before)
    })

    test("the same run twice → the same units", () => {
        const run = startedRun(1)
        expect(partyUnits(run)).toEqual(partyUnits(run))
    })
})

describe("duelSave", () => {
    test("two camps of a player each → a battle that loads, a team a camp, the units of a camp together", () => {
        const battle = loadBattle(duelSave([[party("a", 1)], [party("b", 2)]], 7))
        expect(battle.units.map(unit => unit.team.name)).toEqual(["Camp 1", "Camp 1", "Camp 2", "Camp 2"])
        expect(battle.round).toBe(0)
        expect(battle.phase).toBe("draw")
    })

    test("a name two players share → told apart by the name of the player, and only those", () => {
        const save = duelSave([[party("a", 1)], [party("b", 2)]], 7)
        const names = save.units.map(unit => unit.name)
        expect(new Set(names).size).toBe(names.length)
        expect(names.some(name => name.endsWith("(a)"))).toBe(true)
        expect(names.some(name => name.endsWith("(b)"))).toBe(true)
        const alone = duelSave([[party("a", 1)], [{ name: "b", units: [] }]], 7)
        expect(alone.units.map(unit => unit.name)).toEqual(partyUnits(startedRun(1)).map(unit => unit.name))
    })

    test("two players in a camp → their units together, the party of each kept in order", () => {
        const save = duelSave([[party("a", 1), party("c", 3)], [party("b", 2)]], 7)
        expect(save.units).toHaveLength(6)
        expect(save.units.slice(0, 4).every(unit => unit.team === 0)).toBe(true)
        expect(save.units.slice(4).every(unit => unit.team === 1)).toBe(true)
        expect(loadBattle(save).units).toHaveLength(6)
    })

    test("a camp of nine units → each on a spot of its own, the camps on their own halves", () => {
        const nine: DuelParty[] = [party("a", 1), party("b", 2), party("c", 3)].map(each => {
            return { name: each.name, units: [...each.units, ...each.units, ...each.units].slice(0, 3) }
        })
        const save = duelSave([nine, [party("d", 4)]], 7)
        const mine = save.units.filter(unit => unit.team === 0)
        expect(mine).toHaveLength(9)
        expect(new Set(mine.map(unit => unit.position.join())).size).toBe(9)
        const theirs = save.units.filter(unit => unit.team === 1)
        const rows = (units: typeof mine) => units.map(unit => unit.position[1])
        expect(Math.min(...rows(mine))).toBeGreaterThan(Math.max(...rows(theirs)))
    })

    test("the battle played to its end → over, whatever the seed", () => {
        const battle = loadBattle(duelSave([[party("a", 1)], [party("b", 2)]], 11))
        for(let step = 0; step < 500 && battle.phase !== "over"; step++){
            for(const unit of battle.awaited.units) battle.commitPlan(unit, battle.planAsBot(unit))
            battle.advance()
        }
        expect(battle.phase).toBe("over")
    })
})
