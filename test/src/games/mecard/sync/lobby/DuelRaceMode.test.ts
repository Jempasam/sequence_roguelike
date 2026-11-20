import { ManualScheduler } from "@game/core"
import type { Fault } from "@game/core"
import { DUEL_HALT, LANCER_KIT, Run, SWORDSMAN_KIT } from "@game/core/mecard"
import {
    duelRaceMode, GuestStage, initialValues, JOIN_WAIT_MS, Lobby, LobbyGuest, LocalRoom, LocalSync,
    NotEnoughPlayersFault, RaceStartedFault, UnknownPlayerFault, versusMode,
} from "@game/core/mecard/sync"
import type { DuelRacePlayer, RaceBench, RaceScreen } from "@game/core/mecard/sync"
import type { FloorType } from "@game/core/mecard"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 8; turn++) await Promise.resolve()
}

/** A screen within the program: the runs it was given, the players it follows, and what it was told. */
function bench() {
    const timer = new ManualScheduler()
    const screens: { run: Run, floor: FloorType|null, followed: DuelRacePlayer[], closed: boolean }[] = []
    const reports: string[] = []
    const raceBench: RaceBench = {
        timer,
        race: firstFloor => {
            const run = new Run(screens.length + 1, undefined, firstFloor ?? undefined)
            run.hire(LANCER_KIT)
            run.hire(SWORDSMAN_KIT)
            const record = { run, floor: firstFloor, followed: [] as DuelRacePlayer[], closed: false }
            screens.push(record)
            const screen: RaceScreen = {
                run,
                follow: player => { record.followed.push(player) },
                close: () => { record.closed = true },
            }
            return screen
        },
        report: text => reports.push(text),
    }
    return { raceBench, timer, screens, reports }
}

describe("races in a lobby", () => {
    test("race of duels → each player of the lobby plays a run of its own, and the race starts once they all joined", async() => {
        const { raceBench, screens } = bench()
        const modes = [duelRaceMode(raceBench)]
        const room = new LocalRoom()
        const channel = new LocalSync()
        const lobby = new Lobby(room, channel, "Hôte", modes)
        const ana = new LobbyGuest(room.join("a"), channel, "Ana", modes)
        const bob = new LobbyGuest(room.join("b"), channel, "Bob", modes)
        expect(lobby.start()).toBeNull()
        await settle()
        expect(screens).toHaveLength(3)
        expect(screens.every(screen => screen.followed.length === 1)).toBe(true)
        expect(screens.every(screen => screen.floor === null)).toBe(true)
        expect(ana.playing).toBe(true)
        expect(bob.playing).toBe(true)
        // Three players joined: the race started, a row of the duels laid on the map of each.
        for(const { run } of screens){
            const rows = run.travel.journey.layers
            expect(rows.some(row => row.every(place => place.halt === DUEL_HALT))).toBe(true)
        }
        lobby.stop()
        expect(screens.every(screen => screen.closed)).toBe(true)
        expect(ana.playing).toBe(false)
    })

    test("versus → the players start on a floor of upgrades, with one row of the duels at its end", async() => {
        const { raceBench, screens } = bench()
        const modes = [versusMode(raceBench)]
        const room = new LocalRoom()
        const channel = new LocalSync()
        const lobby = new Lobby(room, channel, "Hôte", modes)
        new LobbyGuest(room.join("a"), channel, "Ana", modes)
        lobby.selection.set("hauteur", 3)
        expect(lobby.start()).toBeNull()
        await settle()
        expect(screens).toHaveLength(2)
        for(const { run, floor } of screens){
            expect(floor?.name).toBe("Atelier")
            const rows = run.travel.journey.layers
            const duels = rows.map((row, index) => row.every(place => place.halt === DUEL_HALT) ? index : -1)
            expect(duels.filter(index => index >= 0)).toEqual([rows.length - 1])
            // The taverns of the start, three rows of upgrades, the duels.
            expect(rows).toHaveLength(3 + 3 + 1)
        }
    })

    test("a client alone with the host that never joins → the race starts with who joined, after a while", async() => {
        const { raceBench, timer } = bench()
        const modes = [duelRaceMode(raceBench)]
        const room = new LocalRoom()
        const channel = new LocalSync()
        const lobby = new Lobby(room, channel, "Hôte", modes)
        // A client connected to the lobby that does not play the game: it never joins the race.
        room.join("silent")
        const faults: Fault[] = []
        lobby.faulted.add(fault => faults.push(fault))
        lobby.start()
        await settle()
        expect(lobby.playing).toBe(true)
        timer.advance(JOIN_WAIT_MS + 1)
        await settle()
        // Only the host joined: not enough players for a race, which ends it.
        expect(faults.some(fault => fault instanceof NotEnoughPlayersFault)).toBe(true)
        expect(lobby.playing).toBe(false)
    })

    test("a client that comes once the race started → turned away with the reason, nothing played", async() => {
        const { raceBench, screens } = bench()
        const modes = [duelRaceMode(raceBench)]
        const room = new LocalRoom()
        const channel = new LocalSync()
        const lobby = new Lobby(room, channel, "Hôte", modes)
        new LobbyGuest(room.join("a"), channel, "Ana", modes)
        lobby.start()
        await settle()
        const late = new LobbyGuest(room.join("late"), channel, "Tard", modes)
        await settle()
        expect(late.playing).toBe(false)
        expect(screens).toHaveLength(2)
    })

    test("the mode asked to play a client that came late, or not told who it is → the fault, no screen", () => {
        const { raceBench, screens } = bench()
        const [mode] = [duelRaceMode(raceBench)]
        const link = new LocalRoom().join("x")
        const values = initialValues(mode.settings)
        expect(mode.guest(new GuestStage(link, new LocalSync(), "x"), values, "spectator"))
            .toBeInstanceOf(RaceStartedFault)
        expect(mode.guest(new GuestStage(link, new LocalSync(), null), values, "player"))
            .toBeInstanceOf(UnknownPlayerFault)
        expect(screens).toHaveLength(0)
    })

    test("settings → the rules of the race are those of the lobby", () => {
        const { raceBench } = bench()
        const mode = duelRaceMode(raceBench)
        expect(mode.settings.map(setting => setting.id)).toEqual(["vies", "arrivee", "equipe", "frequence"])
        expect(versusMode(raceBench).settings.map(setting => setting.id)).toEqual(["equipe", "hauteur"])
    })
})
