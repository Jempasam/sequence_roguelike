import { BATTLE_SAVE_VERSION, saveBattle } from "@game/core/mecard"
import type { SavedUnit } from "@game/core/mecard"
import { Fault, ManualScheduler } from "@game/core"
import {
    Answerer, Asker, InvalidTeamFault, LocalRoom, TEAM_QUESTION, TEAM_TOPIC, TeamRequest, TimeoutFault,
    UnreadableFault, readTeamMessage, teamFault, writeTeamMessage,
} from "@game/core/mecard/sync"
import type { SyncPeer } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { startedRun } from "../../../fixtures/startedRun"
import { fight } from "./fixtures"
import { expectNoneOf } from "./messageFixtures"

/** Units a simulation can load: those of the first fight of a run. */
function loadableUnits(): SavedUnit[] {
    return saveBattle(fight(startedRun(7))).units.filter(unit => unit.team === 0)
}

describe("Team message", () => {
    test("written → read back the same units", () => {
        const units = loadableUnits()
        expect(readTeamMessage(writeTeamMessage(units))).toEqual(JSON.parse(JSON.stringify(units)))
    })

    test("no unit → a message, read as empty", () => {
        expect(readTeamMessage(writeTeamMessage([]))).toEqual([])
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readTeamMessage, [
            "{}", "{\"version\":1}", `{"version":${BATTLE_SAVE_VERSION}}`, `{"version":${BATTLE_SAVE_VERSION},"units":{}}`,
        ])
    })

    test("another version → unreadable, and both versions are told", () => {
        const result = readTeamMessage(JSON.stringify({ version: BATTLE_SAVE_VERSION + 1, units: [] }))
        expect(result).toBeInstanceOf(UnreadableFault)
        expect((result as UnreadableFault).detail).toContain(String(BATTLE_SAVE_VERSION + 1))
    })

    test("no version → unreadable", () => {
        expect(readTeamMessage(JSON.stringify({ units: [] }))).toBeInstanceOf(UnreadableFault)
    })
})

describe("teamFault", () => {
    test("a team the simulation loads → no fault", () => {
        expect(teamFault("p1", loadableUnits())).toBeNull()
    })

    test("no unit → a fault of that client, saying so", () => {
        const fault = teamFault("p1", [])
        expect(fault).toBeInstanceOf(InvalidTeamFault)
        expect(fault?.who).toBe("p1")
        expect(fault?.describe()).toContain("no unit")
    })

    test("a unit that is not an object, or has no name → a fault, never a throw", () => {
        const unit = loadableUnits()[0]
        expect(teamFault("p1", [null as unknown as SavedUnit])).toBeInstanceOf(InvalidTeamFault)
        expect(teamFault("p1", [5 as unknown as SavedUnit])).toBeInstanceOf(InvalidTeamFault)
        expect(teamFault("p1", [{ ...unit, name: 3 as unknown as string }])).toBeInstanceOf(InvalidTeamFault)
    })

    test("a unit that cannot be loaded → a fault with what the simulation said", () => {
        const unit = loadableUnits()[0]
        const fault = teamFault("p1", [{ ...unit, hand: ["a card nobody ever made"] }])
        expect(fault).toBeInstanceOf(InvalidTeamFault)
        expect(fault?.who).toBe("p1")
    })
})

describe("TeamRequest", () => {
    /** A request over a room, with a client that answers by what a test decides. */
    function request(answer: (() => string)|null) {
        const room = new LocalRoom()
        const timer = new ManualScheduler()
        const asker = new Asker(TEAM_TOPIC, room, timer)
        const team = new TeamRequest(asker, 1_000)
        const peers: SyncPeer[] = []
        room.onJoin(peer => peers.push(peer))
        const link = room.join("p1")
        if(answer) new Answerer(TEAM_TOPIC, link, question => {
            expect(question).toBe(TEAM_QUESTION)
            return answer()
        })
        const received: { id: string, units: readonly SavedUnit[] }[] = []
        const faults: Fault[] = []
        team.teamReceived.add(each => received.push(each))
        team.faulted.add(fault => faults.push(fault))
        return { team, timer, peer: peers[0], received, faults }
    }

    test("a client brings a loadable team → its units, and the team received is told", async() => {
        const units = loadableUnits()
        const { team, peer, received, faults } = request(() => writeTeamMessage(units))
        const answer = await team.ask(peer)
        expect(answer).toEqual(JSON.parse(JSON.stringify(units)))
        expect(received).toHaveLength(1)
        expect(received[0].id).toBe("p1")
        expect(faults).toEqual([])
    })

    test("no answer in time → a TimeoutFault, told as faulted, and it never rejects", async() => {
        const { team, timer, peer, received, faults } = request(null)
        const answer = team.ask(peer)
        timer.advance(1_000)
        const result = await answer
        expect(result).toBeInstanceOf(TimeoutFault)
        expect(faults).toHaveLength(1)
        expect(received).toEqual([])
    })

    test("an answer that is not a team → an UnreadableFault, told as faulted", async() => {
        const { team, peer, received, faults } = request(() => "nonsense")
        const result = await team.ask(peer)
        expect(result).toBeInstanceOf(UnreadableFault)
        expect(faults).toEqual([result])
        expect(received).toEqual([])
    })

    test("an empty team → an InvalidTeamFault, told as faulted", async() => {
        const { team, peer, received, faults } = request(() => writeTeamMessage([]))
        const result = await team.ask(peer)
        expect(result).toBeInstanceOf(InvalidTeamFault)
        expect(faults).toEqual([result])
        expect(received).toEqual([])
    })

    test("a team that cannot be loaded → an InvalidTeamFault, and nothing is received", async() => {
        const unit = loadableUnits()[0]
        const { team, peer, received, faults } = request(() => writeTeamMessage([{ ...unit, hand: ["unknown"] }]))
        const result = await team.ask(peer)
        expect(result).toBeInstanceOf(InvalidTeamFault)
        expect(faults).toHaveLength(1)
        expect(received).toEqual([])
    })
})
