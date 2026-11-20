import { Fault, ManualScheduler, NetSync } from "@game/core"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { DeckAi } from "@game/core/mecard"
import {
    COOP_SEATS, FIXED_SEATS, RunBroadcaster, RunGuest, RunHost, RunReceiver,
} from "@game/core/mecard/sync"

import { nodeNet, signalingOf, startNetServer } from "../../../../fixtures/netServer"
import type { NetServer } from "../../../../fixtures/netServer"
import { fight, unitOf } from "../fixtures"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

let server: NetServer
const opened: NetSync[] = []

beforeEach(async() => {
    server = await startNetServer()
})

afterEach(async() => {
    for(const made of opened.splice(0)) made.close()
    await server.close()
})

/** Wait until something holds. */
async function until(holds: () => boolean): Promise<void> {
    while(!holds()) await new Promise(resolve => setTimeout(resolve, 10))
}

// --- Tests ---

describe("RunGuest over the network", () => {
    test("a client coming to play → seated, plays a round, and ends where the host ends", async() => {
        const timer = new ManualScheduler()
        const main = NetSync.host(nodeNet(), signalingOf(server.url), "battle", timer)
        opened.push(main)
        const code = await main.ready
        if(code instanceof Fault) throw new Error(code.describe())
        const room = main.room
        if(!room) throw new Error("A main client has a room.")
        const run = startedRun(11)
        let told = 0
        const host = new RunHost(run, room, COOP_SEATS, FIXED_SEATS, () => told++)
        new RunBroadcaster(run, main)

        const client = NetSync.view(nodeNet(), signalingOf(server.url), code, timer, true)
        opened.push(client)
        const link = client.link
        if(!link) throw new Error("A client coming to play has a link.")
        const viewer = startedRun(0)
        new RunReceiver(viewer, client)
        const guest = new RunGuest(viewer, link, () => {})
        await until(() => guest.units.length === 1)
        expect(guest.units).toEqual([run.heroes[1].name])

        const battle = fight(run)
        battle.advance()
        await until(() => viewer.battle?.phase === "preparation")
        const unit = unitOf(viewer.battle, guest.units[0])
        viewer.battle?.commit(unit, new DeckAi().decide(unit).chain)
        guest.ready()
        for(const each of battle.awaited.units) if(!host.isGuests(each)) battle.commit(each, new DeckAi().decide(each).chain)
        host.ready()
        await until(() => told === 1)
        battle.advance()
        battle.advance()
        await until(() => viewer.battle?.round === 2 && viewer.battle.phase === "preparation")
        expect(JSON.stringify(viewer.battle?.save())).toBe(JSON.stringify(battle.save()))
    })
})
