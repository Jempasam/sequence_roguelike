import { ManualScheduler } from "@game/core"
import type { Fault } from "@game/core"
import { DUEL_HALT, LANCER_KIT, Run, SWORDSMAN_KIT } from "@game/core/mecard"
import type { FloorType } from "@game/core/mecard"
import {
    duelRaceTable, gameModeAsLobbyMode, JOIN_WAIT_MS, Lobby, LobbyGuest, LocalRoom, LocalSync,
    NotEnoughPlayersFault, RACE_OVER_LINGER_MS, versusTable,
} from "@game/core/mecard/sync"
import type { DuelAccess, DuelRacePlayer, RaceScreen, RaceTableBench } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 40; turn++) await Promise.resolve()
}

/** The screen of one client: the runs it was given, the players it follows, and what it was told. */
class Screen implements RaceTableBench {


    public readonly screens: {
        run: Run, floor: FloorType|null, followed: DuelRacePlayer[], closed: boolean
    }[] = []
    public readonly reports: string[] = []
    public readonly access: DuelAccess[] = []

    constructor(public readonly timer: ManualScheduler){}


    public race(firstFloor: FloorType|null): RaceScreen {
        const run = new Run(this.screens.length + 1, undefined, firstFloor ?? undefined)
        run.hire(LANCER_KIT)
        run.hire(SWORDSMAN_KIT)
        const record = { run, floor: firstFloor, followed: [] as DuelRacePlayer[], closed: false }
        this.screens.push(record)
        return {
            run,
            follow: player => {
                record.followed.push(player)
                player.fighting.add(duel => this.access.push(duel))
                player.watching.add(duel => this.access.push(duel))
            },
            close: () => { record.closed = true },
        }
    }

    public report(text: string): void {
        this.reports.push(text)
    }

    /**
     * Plan what a bot would for the units the player plays in its duel, and say it is ready, once a round.
     */
    public act(): void {
        const duel = this.access.at(-1)
        const battle = duel?.battle
        if(!duel || !battle || battle.phase !== "preparation" || duel.units.length === 0) return
        const key = `${this.access.length}:${battle.round}`
        if(this.#round === key) return
        this.#round = key
        const mine = new Set(duel.units)
        for(const unit of battle.awaited.units){
            if(mine.has(unit.name)) battle.commitPlan(unit, battle.planAsBot(unit))
        }
        duel.submit()
    }


    #round = ""
}

/** A lobby of a host and clients, each with a screen of its own, the mode being the one of the maker. */
function race(make: (screen: Screen) => ReturnType<typeof duelRaceTable>, clients: number) {
    const timer = new ManualScheduler()
    const screens = Array.from({ length: clients + 1 }, () => new Screen(timer))
    const room = new LocalRoom()
    const channel = new LocalSync()
    const lobby = new Lobby(room, channel, "Hôte", [gameModeAsLobbyMode(make(screens[0]), screens[0], screens[0].timer)])
    const guests = Array.from({ length: clients }, (_, index) => new LobbyGuest(
        room.join(`c${index}`), channel, `Joueur ${index}`,
        [gameModeAsLobbyMode(make(screens[index + 1]), screens[index + 1], screens[index + 1].timer)],
    ))
    /** A client that comes to the lobby later, with a screen of its own. */
    const join = (id: string) => {
        const screen = new Screen(timer)
        const guest = new LobbyGuest(
            room.join(id), channel, id, [gameModeAsLobbyMode(make(screen), screen, screen.timer)],
        )
        return { screen, guest }
    }
    return { timer, screens, lobby, guests, room, channel, join }
}

describe("races of the runner in a lobby", () => {
    test("race of duels → each player of the lobby plays a run of its own, and the race starts once they all joined", async() => {
        const { screens, lobby, guests } = race(screen => duelRaceTable(screen), 2)
        expect(lobby.start()).toBeNull()
        await settle()
        expect(screens.every(screen => screen.screens.length === 1)).toBe(true)
        expect(screens.every(screen => screen.screens[0].followed.length === 1)).toBe(true)
        expect(screens.every(screen => screen.screens[0].floor === null)).toBe(true)
        expect(guests.every(guest => guest.playing)).toBe(true)
        // Three players joined: the race started, a row of the duels laid on the map of each.
        for(const { screens: own } of screens){
            const rows = own[0].run.travel.journey.layers
            expect(rows.some(row => row.every(place => place.halt === DUEL_HALT))).toBe(true)
        }
        lobby.stop()
        expect(screens.every(screen => screen.screens[0].closed)).toBe(true)
        expect(guests[0].playing).toBe(false)
    })

    test("versus → the players start on a floor of upgrades, with one row of the duels at its end", async() => {
        const { screens, lobby } = race(screen => versusTable(screen), 1)
        lobby.selection.set("hauteur", 3)
        expect(lobby.start()).toBeNull()
        await settle()
        expect(screens).toHaveLength(2)
        for(const { screens: own } of screens){
            const { run, floor } = own[0]
            expect(floor?.name).toBe("Atelier")
            const rows = run.travel.journey.layers
            const duels = rows.map((row, index) => row.every(place => place.halt === DUEL_HALT) ? index : -1)
            expect(duels.filter(index => index >= 0)).toEqual([rows.length - 1])
        }
    })

    test("a client alone with the host that never joins → the race starts with who joined, after a while", async() => {
        const { timer, lobby, room, screens } = race(screen => duelRaceTable(screen), 0)
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
        expect(lobby.playing).toBe(false)
        expect(screens[0].reports).toContain(new NotEnoughPlayersFault(1).describe())
    })

    test("a versus of three → the players sent to the duels fight them, and the last one standing wins", async() => {
        const { timer, screens, lobby, guests } = race(screen => versusTable(screen), 2)
        lobby.selection.set("hauteur", 2)
        lobby.start()
        await settle()
        // Every party is sent to the halt of the duels, which tells the manager where it stands.
        for(const screen of screens) screen.screens[0].followed[0].contestant.kick()
        await settle()
        for(let turn = 0; turn < 600 && lobby.playing; turn++){
            for(const screen of screens) screen.act()
            // Whoever the duels let go is sent to the next ones, as a late player is.
            for(const screen of screens) screen.screens[0].followed[0].contestant.kick()
            await settle()
            if(screens.every(screen => screen.screens[0].followed[0].lives.alive().length <= 1)) break
        }
        const lives = screens[0].screens[0].followed[0].lives
        expect(lives.alive()).toHaveLength(1)
        // With three players one has no duel to fight, and watches one.
        expect(screens.some(screen => screen.access.some(duel => duel.units.length === 0))).toBe(true)
        // The players read who won, then the lobby is theirs again.
        timer.advance(RACE_OVER_LINGER_MS + 1)
        await settle()
        expect(lobby.playing).toBe(false)
        expect(guests.every(guest => !guest.playing)).toBe(true)
    })
})

describe("races of the runner, at their edges", () => {
    /** A race of duels of three players, two lives, thirty seconds to arrive, started. */
    async function started() {
        const made = race(screen => duelRaceTable(screen), 2)
        made.lobby.selection.set("vies", 2)
        made.lobby.selection.set("arrivee", 30)
        made.lobby.start()
        await settle()
        return made
    }

    const playerOf = (screen: Screen) => screen.screens[0].followed[0]

    test("a player late to the duels → one life lost and sent there, the round going on without waiting", async() => {
        const { timer, screens } = await started()
        playerOf(screens[0]).contestant.kick()
        playerOf(screens[1]).contestant.kick()
        await settle()
        expect(playerOf(screens[0]).lives.livesOf("c1")).toBe(2)
        timer.advance(30_001)
        await settle()
        expect(playerOf(screens[0]).lives.livesOf("c1")).toBe(1)
        expect(playerOf(screens[2]).contestant.waitingAt).not.toBeNull()
    })

    test("a player whose connection is lost → the time goes on and it is late as any, and told again once back", async() => {
        const { timer, screens, room } = await started()
        room.drop("c1")
        playerOf(screens[0]).contestant.kick()
        playerOf(screens[1]).contestant.kick()
        await settle()
        timer.advance(30_001)
        await settle()
        expect(playerOf(screens[0]).lives.livesOf("c1")).toBe(1)
        // The order was lost with the connection.
        expect(playerOf(screens[2]).contestant.waitingAt).toBeNull()
        room.back("c1")
        await settle()
        expect(playerOf(screens[2]).contestant.waitingAt).not.toBeNull()
    })

    test("players that leave for good → out at once, and the last one left wins, the lobby theirs after a while", async() => {
        const { timer, screens, room, lobby, guests } = await started()
        const won: string[] = []
        playerOf(screens[0]).won.add(winner => won.push(winner))
        room.leave("c1")
        await settle()
        expect(playerOf(screens[0]).lives.livesOf("c1")).toBe(0)
        expect(lobby.playing).toBe(true)
        expect(won).toEqual([])
        room.leave("c0")
        await settle()
        expect(won).toEqual(["host"])
        timer.advance(RACE_OVER_LINGER_MS + 1)
        await settle()
        expect(lobby.playing).toBe(false)
        expect(guests.length).toBe(2)
    })

    test("a client that quits the game → out, and when it comes back it only watches: no run of its own again", async() => {
        const { screens, guests } = await started()
        expect(guests[1].quitGame()).toBe(true)
        await settle()
        expect(playerOf(screens[0]).lives.livesOf("c1")).toBe(0)
        const runs = screens[2].screens.length
        guests[1].rejoin()
        await settle()
        expect(screens[2].screens.length).toBe(runs)
        expect(playerOf(screens[0]).lives.livesOf("c1")).toBe(0)
    })

    test("someone that comes before the first arrival → plays a run of its own, with the fewest lives; after it → only watches", async() => {
        const { screens, join } = await started()
        const early = join("early")
        await settle()
        expect(early.screen.screens).toHaveLength(1)
        expect(playerOf(screens[0]).lives.livesOf("early")).toBe(2)
        // The first player arrives at the duels: the others are waited for, and nobody comes any more.
        playerOf(screens[0]).contestant.kick()
        await settle()
        const late = join("late")
        await settle()
        expect(late.screen.screens).toHaveLength(0)
        expect(playerOf(screens[0]).lives.livesOf("late")).toBeNull()
    })

    test("a race that is over → a client that comes is not given a run", async() => {
        const { timer, screens, room, join } = await started()
        room.leave("c1")
        room.leave("c0")
        await settle()
        expect(playerOf(screens[0]).lives.alive()).toEqual(["host"])
        const after = join("after")
        await settle()
        expect(after.screen.screens).toHaveLength(0)
        timer.advance(RACE_OVER_LINGER_MS + 1)
        await settle()
    })
})
