import { LANCER_KIT, Run, SWORDSMAN_KIT } from "@game/core/mecard"
import {
    Lobby, LobbyGuest, LocalRoom, LocalSync, runCoopMode, runEnemyMode,
} from "@game/core/mecard/sync"
import type { HostedRun, JoinedRun, RunBench } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 5; turn++) await Promise.resolve()
}

/** A screen within the program: the runs it was given, and what it was told. */
function bench() {
    const hosted: { run: Run, locked: string[], closed: boolean, rounds: number, handle: HostedRun }[] = []
    const joined: { run: Run, seats: (readonly string[])[], closed: boolean, handle: JoinedRun }[] = []
    const reports: string[] = []
    const screen: RunBench = {
        host: () => {
            const run = new Run(7)
            run.hire(LANCER_KIT)
            run.hire(SWORDSMAN_KIT)
            const record = { run, locked: [] as string[], closed: false, rounds: 0 } as typeof hosted[number]
            record.handle = {
                run: record.run,
                startRound: () => { record.rounds++ },
                lockGuests: () => { record.locked.push("locked") },
                onReady: null,
                onOver: null,
                close: () => { record.closed = true },
            }
            hosted.push(record)
            return record.handle
        },
        join: () => {
            const record = {
                run: new Run(0), seats: [] as (readonly string[])[], closed: false,
            } as typeof joined[number]
            record.handle = {
                run: record.run,
                seat: units => { record.seats.push(units) },
                onReady: null,
                close: () => { record.closed = true },
            }
            joined.push(record)
            return record.handle
        },
        report: text => reports.push(text),
    }
    return { screen, hosted, joined, reports }
}

describe("run modes in a lobby", () => {
    test("coop → the host plays a new run, a client of the lobby plays by its side, and both are shut at the end", async() => {
        const { screen, hosted, joined } = bench()
        const modes = [runCoopMode(screen)]
        const room = new LocalRoom()
        const channel = new LocalSync()
        const lobby = new Lobby(room, channel, "Hôte", modes)
        const ana = new LobbyGuest(room.join("a"), channel, "Ana", modes)
        expect(lobby.start()).toBeNull()
        await settle()
        expect(hosted).toHaveLength(1)
        expect(hosted[0].locked).toHaveLength(1)
        expect(joined).toHaveLength(1)
        expect(ana.playing).toBe(true)
        // The client came to play: the host dealt it a hero.
        expect(joined[0].seats.at(-1)?.length ?? 0).toBeGreaterThan(0)
        lobby.stop()
        expect(hosted[0].closed).toBe(true)
        expect(joined[0].closed).toBe(true)
        expect(ana.playing).toBe(false)
    })

    test("a client that quits the game → back in the lobby, its seats given back, and it may play again", async() => {
        const { screen, joined } = bench()
        const modes = [runCoopMode(screen)]
        const room = new LocalRoom()
        const channel = new LocalSync()
        const lobby = new Lobby(room, channel, "Hôte", modes)
        const ana = new LobbyGuest(room.join("a"), channel, "Ana", modes)
        lobby.start()
        await settle()
        expect(ana.quitGame()).toBe(true)
        expect(ana.playing).toBe(false)
        expect(ana.gameGoing).toBe(true)
        expect(lobby.playing).toBe(true)
        expect(joined[0].closed).toBe(true)
        ana.rejoin()
        await settle()
        expect(ana.playing).toBe(true)
        expect(joined).toHaveLength(2)
        // Given a hero again, as the first time.
        expect(joined[1].seats.at(-1)?.length ?? 0).toBeGreaterThan(0)
    })

    test("the party falls on the host → the game is over, and the lobby is free again", async() => {
        const { screen, hosted } = bench()
        const modes = [runCoopMode(screen)]
        const lobby = new Lobby(new LocalRoom(), new LocalSync(), "Hôte", modes)
        lobby.start()
        await settle()
        hosted[0].handle.onOver?.()
        expect(lobby.playing).toBe(false)
        expect(hosted[0].closed).toBe(true)
        expect(lobby.selection.playing).toBe(false)
    })

    test("a client that comes late → watches: shown the run, never given a unit", async() => {
        const { screen, joined } = bench()
        const modes = [runCoopMode(screen)]
        const room = new LocalRoom()
        const channel = new LocalSync()
        const lobby = new Lobby(room, channel, "Hôte", modes)
        lobby.start()
        await settle()
        new LobbyGuest(room.join("late"), channel, "Tard", modes)
        await settle()
        expect(joined).toHaveLength(1)
        expect(joined[0].seats).toEqual([])
    })

    test("enemy mode → another mode of the lobby, with the places set to random", async() => {
        const { screen, hosted } = bench()
        const modes = [runCoopMode(screen), runEnemyMode(screen)]
        const lobby = new Lobby(new LocalRoom(), new LocalSync(), "Hôte", modes)
        expect(lobby.selection.select("run-ennemi")).toBeNull()
        expect(lobby.selection.set("places", "aléatoires")).toBeNull()
        expect(lobby.start()).toBeNull()
        await settle()
        expect(hosted).toHaveLength(1)
        lobby.dispose()
        expect(hosted[0].closed).toBe(true)
    })
})
