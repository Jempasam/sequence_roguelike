import { LobbyRoom } from "@game/core-src/games/mecard/sync/lobby/LobbyRoom"
import { HostStage } from "@game/core-src/games/mecard/sync/lobby/Stage"
import { RunBroadcaster } from "@game/core-src/games/mecard/sync/run/RunBroadcaster"
import { RunGuest } from "@game/core-src/games/mecard/sync/run/RunGuest"
import { RunHost } from "@game/core-src/games/mecard/sync/run/RunHost"
import { RunReceiver } from "@game/core-src/games/mecard/sync/run/RunReceiver"
import { COOP_SEATS, FIXED_SEATS } from "@game/core-src/games/mecard/sync/run/Seats"
import { LocalRoom, LocalSync } from "@game/core-src/games/mecard/sync/SyncChannel"
import { describe, expect, test } from "vitest"

import { startedRun } from "../../../../fixtures/startedRun"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    await Promise.resolve()
    await Promise.resolve()
}

describe("a run hosted on a stage", () => {
    test("client in the lobby before the run → seated once it says it came, and told the run as it stands", async() => {
        const room = new LocalRoom()
        const channel = new LocalSync()
        const lobby = new LobbyRoom(room)
        // Connected in the lobby, before any game.
        const link = room.join("early")
        const run = startedRun(11)
        const stage = new HostStage(lobby, channel)
        new RunHost(run, stage.room, COOP_SEATS, FIXED_SEATS, () => {})
        new RunBroadcaster(run, stage.sender)
        await settle()
        const viewer = startedRun(0)
        const seats: (readonly string[])[] = []
        new RunReceiver(viewer, channel)
        new RunGuest(viewer, link, units => seats.push(units))
        stage.greetAll()
        expect(seats.at(-1)?.length ?? 0).toBeGreaterThan(0)
    })
})
