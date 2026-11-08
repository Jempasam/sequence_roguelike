import { describe, expect, test } from "vitest"
import { BURN, CardChain, loadBattle, planFor, POISONED, Run } from "@game/core/mecard"
import type { Battle } from "@game/core/mecard"
import { started } from "../fixtures"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** The first battle of a run, its first round drawn. */
function firstBattle(seed = 3): Battle {
    return started(startedRun(seed))
}

/** Commit what the bot would play for every unit, players included. */
function planAll(battle: Battle): void {
    for(const unit of battle.initiative) battle.commit(unit, planFor(unit))
}

/** A battle with statuses on its units, which listen to it. */
function burning(): Battle {
    const battle = firstBattle()
    battle.applyStatus(battle.units[0], BURN, 2)
    battle.applyStatus(battle.units[1], POISONED, 2)
    return battle
}

// --- Tests ---

describe("Battle.load", () => {
    test("a save loaded on another battle → the same save written back", () => {
        const source = firstBattle(3)
        planAll(source)
        const save = source.save()
        const battle = firstBattle(9)
        battle.load(save)
        expect(JSON.stringify(battle.save())).toBe(JSON.stringify(save))
    })

    test("loaded → plays the round as the battle it comes from", () => {
        const source = firstBattle()
        planAll(source)
        const battle = firstBattle(9)
        battle.load(source.save())
        source.endPreparation()
        source.playRound()
        battle.endPreparation()
        battle.playRound()
        expect(JSON.stringify(battle.save())).toBe(JSON.stringify(source.save()))
    })

    test("loaded → what plugged itself in is gone, as many listeners as a battle new", () => {
        const source = burning()
        const save = source.save()
        const fresh = loadBattle(save)
        const battle = burning()
        battle.load(save)
        expect(battle.roundEnded.size).toBe(fresh.roundEnded.size)
        expect(battle.unitMoved.size).toBe(fresh.unitMoved.size)
        expect(battle.unitStepping.size).toBe(fresh.unitStepping.size)
    })

    test("loaded → what listens from outside stays, told of the load only", () => {
        const battle = firstBattle(9)
        const told: string[] = []
        battle.phaseChanged.add(phase => told.push(phase))
        battle.loaded.add(() => told.push("loaded"))
        battle.load(firstBattle(3).save())
        expect(told).toEqual(["loaded"])
    })

    test("loaded → the log and the clock start over", () => {
        const battle = firstBattle(9)
        planAll(battle)
        battle.endPreparation()
        battle.playRound()
        battle.load(firstBattle(3).save())
        expect(battle.events).toEqual([])
        expect(battle.clock).toBe(0)
    })
})

describe("Battle.advance", () => {
    test("waiting for its round → it starts, and the bots commit", () => {
        const battle = startedRun(3).newBattle()
        battle.advance()
        expect(battle.phase).toBe("preparation")
        const bots = battle.initiative.filter(unit => unit.controller === "bot")
        expect(bots.length).toBeGreaterThan(0)
        for(const bot of bots) expect(battle.planOf(bot)).toBeDefined()
    })

    test("a chain still owed → it names the unit, and refuses to go on", () => {
        const battle = firstBattle()
        const players = battle.initiative.filter(unit => unit.controller === "player")
        expect(battle.awaited.units).toEqual(players)
        expect(battle.canAdvance).toBe(false)
        expect(() => battle.advance()).toThrow()
    })

    test("every chain committed → the round is played out", () => {
        const battle = firstBattle()
        for(const unit of battle.initiative) battle.commit(unit, new CardChain())
        expect(battle.awaited.units).toEqual([])
        battle.advance()
        expect(battle.executing).toBe(false)
        expect(battle.phase === "draw" || battle.phase === "over").toBe(true)
    })
})

describe("Travel", () => {
    test("loaded → stands where the save has it, told once", () => {
        const source = startedRun(5)
        source.travel.jump(source.travel.next[0])
        const run = startedRun(5)
        let told = 0
        run.travel.loaded.add(() => told++)
        run.travel.load(source.travel.save())
        expect(run.travel.depth).toBe(source.travel.depth)
        expect(run.travel.place?.type).toBe(source.travel.place?.type)
        expect(told).toBe(1)
    })

    test("on the map → waits for a place, not to go on", () => {
        const { travel } = startedRun(5)
        expect(travel.awaited.places).toEqual(travel.next)
        expect(travel.canAdvance).toBe(false)
    })

    test("entering a place → waits to go on, then is in", () => {
        const { travel } = startedRun(5)
        travel.go(travel.next[0])
        expect(travel.awaited.places).toEqual([])
        expect(travel.canAdvance).toBe(true)
        travel.advance()
        expect(travel.phase).not.toBe("entering")
    })
})

describe("Run", () => {
    test("loaded → the party, the gold and the numbers of the save, what listens kept", () => {
        const source = startedRun(5)
        source.gold = 321
        source.fire(source.heroes[0])
        const run = startedRun(8)
        const told: Run[] = []
        run.loaded.add(loaded => told.push(loaded))
        run.load(source.save())
        expect(run.gold).toBe(321)
        expect(run.heroes.map(hero => hero.name)).toEqual(source.heroes.map(hero => hero.name))
        expect(run.rng.state).toBe(source.rng.state)
        expect(told).toEqual([run])
    })

    test("a fight reached → going on starts its battle", () => {
        const run = startedRun(5)
        const { travel } = run
        const before = travel.journey.places.find(place => {
            return travel.journey.nextOf(place).some(next => next.monsters.length > 0)
        })
        if(!before) throw new Error("The map leads to no fight.")
        travel.jump(before)
        const fight = travel.next.find(next => next.monsters.length > 0)
        if(!fight) throw new Error("The map leads to no fight.")
        expect(run.canAdvance).toBe(false)
        travel.go(fight)
        travel.advance()
        expect(run.canAdvance).toBe(true)
        run.advance()
        expect(run.phase).toBe("battle")
    })

    test("joining a battle fought elsewhere → it is the one being fought, and told", () => {
        const save = firstBattle().save()
        const run = startedRun(5)
        const told: Battle[] = []
        run.battleStarted.add(battle => told.push(battle))
        run.joinBattle(save)
        expect(run.phase).toBe("battle")
        expect(told).toEqual([run.battle])
        expect(JSON.stringify(run.battle?.save())).toBe(JSON.stringify(save))
    })
})
