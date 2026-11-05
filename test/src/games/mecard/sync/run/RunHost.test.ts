import { describe, expect, test } from "vitest"
import { planFor, POSSESSED, Rng } from "@game/core/mecard"
import { ENEMY_SEATS, FIXED_SEATS, COOP_SEATS, randomSeats } from "@game/core/mecard/sync"

import { connected, fight, hosted, unitOf } from "../fixtures"

// --- Tests ---

describe("RunHost in coop", () => {
    test("fixed → the host keeps the first hero, the client gets the next", () => {
        const session = hosted()
        const { seats } = connected(session, "a")
        expect(seats).toEqual([[session.run.heroes[1].name]])
        expect(session.host.isGuests(session.run.heroes[0])).toBe(false)
        expect(session.host.isGuests(session.run.heroes[1])).toBe(true)
    })

    test("random → the client gets a hero the host did not keep", () => {
        for(let seed = 0; seed < 8; seed++){
            const session = hosted(COOP_SEATS, randomSeats(new Rng(seed)))
            const { guest } = connected(session, "a")
            expect(guest.units).toHaveLength(1)
            const others = session.run.heroes.filter(hero => hero.name !== guest.units[0])
            expect(others.some(hero => !session.host.isGuests(hero))).toBe(true)
        }
    })

    test("more clients than heroes → the last only watches", () => {
        const session = hosted()
        connected(session, "a")
        const { guest, seats } = connected(session, "b")
        expect(guest.units).toEqual([])
        expect(seats).toEqual([])
    })

    test("a client that says nothing → never given anything", () => {
        const session = hosted()
        session.room.join("watching")
        for(const hero of session.run.heroes) expect(session.host.isGuests(hero)).toBe(false)
    })

    test("a client leaving → the next one to come gets its hero", () => {
        const session = hosted()
        connected(session, "a")
        session.room.leave("a")
        expect(session.host.isGuests(session.run.heroes[1])).toBe(false)
        expect(connected(session, "b").guest.units).toEqual([session.run.heroes[1].name])
    })

    test("a client coming during a battle → seated at the next round, not before", () => {
        const session = hosted()
        const battle = fight(session.run)
        battle.advance()
        const { guest } = connected(session, "a")
        expect(guest.units).toEqual([])
        for(const unit of battle.awaited.units) battle.commit(unit, planFor(unit))
        battle.advance()
        battle.advance()
        expect(guest.units).toEqual([session.run.heroes[1].name])
    })

    test("a client playing a hero leaving the party → given what is left, or nothing", () => {
        const session = hosted()
        const { guest, seats } = connected(session, "a")
        session.run.fire(session.run.heroes[1])
        expect(guest.units).toEqual([])
        expect(seats.at(-1)).toEqual([])
    })
})

describe("RunHost in enemy mode", () => {
    test("on the map → nothing to give yet", () => {
        const session = hosted(ENEMY_SEATS)
        expect(connected(session, "a").guest.units).toEqual([])
    })

    test("a battle starting → a monster given, waited for, and told as such", () => {
        const session = hosted(ENEMY_SEATS)
        const { guest, viewer } = connected(session, "a")
        const battle = fight(session.run)
        const [name] = guest.units
        const unit = unitOf(battle, name)
        expect(unit.team).toBe(session.run.monstersTeam)
        expect(unitOf(viewer.battle, name).controller).toBe("player")
        expect(unitOf(viewer.battle, name).color).toEqual(unit.color)
        battle.advance()
        expect(battle.awaited.units).toContain(unit)
        expect(battle.planOf(unit)).toBeUndefined()
    })

    test("a monster given → possessed on both sides, the others left alone", () => {
        const session = hosted(ENEMY_SEATS)
        const { guest, viewer } = connected(session, "a")
        const battle = fight(session.run)
        const [name] = guest.units
        expect(unitOf(battle, name).statuses.has(POSSESSED)).toBe(true)
        expect(unitOf(viewer.battle, name).statuses.has(POSSESSED)).toBe(true)
        const others = battle.units.filter(unit => unit.name !== name)
        expect(others.some(unit => unit.statuses.has(POSSESSED))).toBe(false)
    })

    test("a monster given → its deck shuffled, on the numbers of the battle", () => {
        const piles = (given: boolean): string => {
            const session = hosted(ENEMY_SEATS)
            if(given) connected(session, "a")
            const battle = fight(session.run)
            const unit = battle.units.find(each => each.team === session.run.monstersTeam)
            return JSON.stringify(unit?.decks.piles.map(card => card.name))
        }
        expect(piles(true)).not.toBe(piles(false))
    })

    test("two rounds with a monster given → no drift of the client", () => {
        const session = hosted(ENEMY_SEATS)
        const { guest, viewer, receiver } = connected(session, "a")
        const battle = fight(session.run)
        const drifts: unknown[] = []
        receiver.battle.onDesync = drift => drifts.push(drift)
        battle.advance()
        let rounds = 0
        for(; rounds < 2 && battle.phase === "preparation"; rounds++){
            const unit = unitOf(viewer.battle, guest.units[0])
            viewer.battle?.commit(unit, planFor(unit))
            guest.ready()
            const hostUnits = battle.awaited.units.filter(each => !session.host.isGuests(each))
            for(const each of hostUnits) battle.commit(each, planFor(each))
            session.host.ready()
            battle.advance()
            if(battle.waiting) battle.advance()
        }
        expect(rounds).toBe(2)
        expect(drifts).toEqual([])
    })

    test("a client leaving → its monster no longer possessed", () => {
        const session = hosted(ENEMY_SEATS)
        const { guest } = connected(session, "a")
        const battle = fight(session.run)
        const unit = unitOf(battle, guest.units[0])
        session.room.leave("a")
        expect(unit.statuses.has(POSSESSED)).toBe(false)
        expect(unit.stats.ordered.value).toBe(true)
    })

    test("the host → keeps every hero", () => {
        const session = hosted(ENEMY_SEATS)
        connected(session, "a")
        fight(session.run)
        for(const hero of session.run.heroes) expect(session.host.isGuests(hero)).toBe(false)
    })

    test("more monsters than clients → the others stay bots", () => {
        const session = hosted(ENEMY_SEATS, FIXED_SEATS)
        connected(session, "a")
        const battle = fight(session.run)
        const monsters = battle.units.filter(unit => unit.team === session.run.monstersTeam)
        expect(monsters.filter(unit => unit.controller === "player")).toHaveLength(1)
    })

    test("a new battle → its monsters given anew", () => {
        const session = hosted(ENEMY_SEATS)
        const { guest } = connected(session, "a")
        fight(session.run)
        session.run.backToMap()
        session.run.startBattle()
        const unit = unitOf(session.run.battle, guest.units[0])
        expect(unit.controller).toBe("player")
    })

    test("a client coming once the rounds began → nothing until the next battle", () => {
        const session = hosted(ENEMY_SEATS)
        const battle = fight(session.run)
        battle.advance()
        const { guest } = connected(session, "a")
        for(const unit of battle.awaited.units) battle.commit(unit, planFor(unit))
        battle.advance()
        battle.advance()
        expect(guest.units).toEqual([])
    })

    test("a client leaving during a preparation → its monster planned, a bot again", () => {
        const session = hosted(ENEMY_SEATS)
        const { guest } = connected(session, "a")
        const battle = fight(session.run)
        battle.advance()
        const unit = unitOf(battle, guest.units[0])
        session.room.leave("a")
        expect(unit.controller).toBe("bot")
        expect(battle.planOf(unit)).toBeDefined()
    })
})

describe("RunHost.engine", () => {
    test("another run → the seats given anew, the client told when they change", () => {
        const session = hosted()
        const { guest } = connected(session, "a")
        const [before] = guest.units
        session.host.engine = session.run
        expect(guest.units).toEqual([before])
    })
})
