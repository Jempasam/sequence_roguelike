import { DeckAi } from "@game/core-src/games/mecard/sim/ai/Bot"
import { readBattleMessage } from "@game/core-src/games/mecard/sync/battle/BattleMessage"
import { readPlanMessage } from "@game/core-src/games/mecard/sync/battle/PlanMessage"
import { UnreadableFault } from "@game/core-src/games/mecard/sync/faults"
import { readRunMessage } from "@game/core-src/games/mecard/sync/run/RunMessage"
import { readSeatMessage } from "@game/core-src/games/mecard/sync/run/SeatMessage"
import { COOP_SEATS } from "@game/core-src/games/mecard/sync/run/Seats"
import { readTravelMessage } from "@game/core-src/games/mecard/sync/travel/TravelMessage"
import { describe, expect, test } from "vitest"

import { connected, fight, hosted, unitOf } from "../fixtures"
import type { Hosted, Playing } from "../fixtures"

// --- Fixture builders ---

/** One round as the host and the clients ready play it, then the battle on to the next preparation. */
function play(session: Hosted, battle: NonNullable<Hosted["run"]["battle"]>, clients: readonly Playing[]): void {
    for(const client of clients){
        for(const name of client.guest.units){
            const unit = unitOf(client.viewer.battle, name)
            client.viewer.battle?.commit(unit, new DeckAi().decide(unit).chain)
        }
        client.guest.ready()
    }
    for(const unit of battle.awaited.units){
        if(!session.host.isGuests(unit)) battle.commit(unit, new DeckAi().decide(unit).chain)
    }
    session.host.ready()
}

// --- Tests ---

describe("RunHost with a connection that drops", () => {
    test("a client lost then back → told what it plays again, though it is the same", () => {
        const session = hosted(COOP_SEATS)
        const { seats } = connected(session, "a")
        const before = seats.length
        session.room.drop("a")
        expect(seats).toHaveLength(before)
        session.room.back("a")
        expect(seats).toHaveLength(before + 1)
        expect(seats.at(-1)).toEqual(seats.at(-2))
    })

    test("a client lost → keeps its seat, which the next client to come does not get", () => {
        const session = hosted(COOP_SEATS)
        const { guest } = connected(session, "a")
        session.room.drop("a")
        expect(session.host.isGuests(session.run.heroes[1])).toBe(true)
        expect(connected(session, "b").guest.units).toEqual([])
        expect(guest.units).toHaveLength(1)
    })

    test("a client lost in a round → not waited for, its unit planned as a bot", () => {
        const session = hosted(COOP_SEATS)
        const { guest } = connected(session, "a")
        const battle = fight(session.run)
        battle.advance()
        session.room.drop("a")
        for(const unit of battle.awaited.units){
            if(!session.host.isGuests(unit)) battle.commit(unit, new DeckAi().decide(unit).chain)
        }
        session.host.ready()
        expect(session.told()).toBe(1)
        expect(battle.planOf(unitOf(battle, guest.units[0]))).toBeDefined()
    })

    test("a client lost → its unit still a bot at the next round, and waited for again once back", () => {
        const session = hosted(COOP_SEATS)
        const client = connected(session, "a")
        const battle = fight(session.run)
        const hostCommits = (): void => {
            for(const unit of battle.awaited.units){
                if(!session.host.isGuests(unit)) battle.commit(unit, new DeckAi().decide(unit).chain)
            }
            session.host.ready()
        }
        const nextRound = (): void => {
            battle.advance()
            if(battle.waiting) battle.advance()
        }
        battle.advance()
        session.room.drop("a")
        hostCommits()
        expect(session.told()).toBe(1)
        nextRound()
        expect(battle.phase).toBe("preparation")
        // Still away at the second round: its unit has its plan already, and nothing is waited for.
        expect(battle.planOf(unitOf(battle, client.guest.units[0]))).toBeDefined()
        hostCommits()
        expect(session.told()).toBe(2)
        session.room.back("a")
        nextRound()
        expect(battle.phase).toBe("preparation")
        // Back for the third round: the client is waited for again.
        hostCommits()
        expect(session.told()).toBe(2)
        play(session, battle, [client])
        expect(session.told()).toBe(3)
    })

    test("a client gone for good → its seat free again", () => {
        const session = hosted(COOP_SEATS)
        connected(session, "a")
        session.room.drop("a")
        session.room.leave("a")
        expect(session.host.isGuests(session.run.heroes[1])).toBe(false)
        expect(connected(session, "b").guest.units).toEqual([session.run.heroes[1].name])
    })

    test("guests joined and left → told", () => {
        const session = hosted(COOP_SEATS)
        const told: string[] = []
        session.host.guestJoined.add(id => told.push(`joined ${id}`))
        session.host.guestLeft.add(id => told.push(`left ${id}`))
        connected(session, "a")
        session.room.leave("a")
        expect(told).toEqual(["joined a", "left a"])
    })
})

describe("what is received that cannot be read", () => {
    test("every reader of a message → a fault, never a throw", () => {
        const readers = [
            readPlanMessage, readSeatMessage, readBattleMessage, readRunMessage, readTravelMessage,
        ]
        for(const read of readers){
            expect(read("not json at all")).toBeInstanceOf(UnreadableFault)
            expect(read("{}")).toBeInstanceOf(UnreadableFault)
            expect(read("null")).toBeInstanceOf(UnreadableFault)
        }
    })

    test("a fault → says its topic, what came, and why", () => {
        const fault = readPlanMessage("{}")
        if(!(fault instanceof UnreadableFault)) throw new Error("Expected a fault.")
        expect(fault.topic).toBe("plan")
        expect(fault.text).toBe("{}")
        expect(fault.describe()).toContain("plan")
    })
})
