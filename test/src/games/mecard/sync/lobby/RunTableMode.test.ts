import { LANCER_KIT, SWORDSMAN_KIT } from "@game/core-src/games/mecard/sim/catalog/kits"
import { Run } from "@game/core-src/games/mecard/sim/run/Run"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import type { Seatable } from "@game/core-src/games/mecard/sync/run/Seats"
import { runTableMode } from "@game/core-src/games/mecard/sim/mode/subs/runTable/RunTableMode"
import { Lobby } from "@game/core-src/games/mecard/sync/lobby/Lobby"
import { LobbyGuest } from "@game/core-src/games/mecard/sync/lobby/LobbyGuest"
import { ParticipantChoices } from "@game/core-src/games/mecard/sync/lobby/ParticipantChoices"
import { gameModeAsLobbyMode } from "@game/core-src/games/mecard/sync/mode/gameModeAsLobbyMode"
import { LocalRoom, LocalSync } from "@game/core-src/games/mecard/sync/SyncChannel"
import type { ClientRuns } from "@game/core-src/games/mecard/sim/mode/subs/runTable/TableOwner"
import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import { fight } from "../fixtures"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 30; turn++) await Promise.resolve()
}

/** The screen of one client: what it was shown, and what it was told. */
class Screen implements ClientRuns {


    public readonly timer = new ManualScheduler()
    public readonly runs: Run[] = []
    public readonly owned: {
        run: Run, isGuests: (unit: Seatable) => boolean, ready: () => void, over: () => void
    }[] = []
    public readonly seats: (readonly string[])[] = []
    public readonly readies: (() => void)[] = []
    public rounds = 0
    public hidden = 0
    public readonly reports: string[] = []


    public create(seed: number): Run {
        const run = new Run(seed)
        run.hire(LANCER_KIT)
        run.hire(SWORDSMAN_KIT)
        this.runs.push(run)
        return run
    }

    public showOwned(
        run: Run, isGuests: (unit: Seatable) => boolean, ready: () => void, over: () => void,
    ): void {
        this.owned.push({ run, isGuests, ready, over })
    }

    public showSeat(run: Run, units: readonly string[], ready: () => void): void {
        // The replica of a run followed is made by the game, not by the screen: it is known once shown.
        if(!this.runs.includes(run)) this.runs.push(run)
        this.seats.push(units)
        this.readies.push(ready)
    }

    public startRound(): void {
        this.rounds++
    }

    public hideRun(): void {
        this.hidden++
    }

    public report(text: string): void {
        this.reports.push(text)
    }
}

/** A lobby of a host and clients, each with a screen of its own. */
function table(make: (screen: Screen) => ReturnType<typeof runTableMode>[], ...names: string[]) {
    const screens = [new Screen(), ...names.map(() => new Screen())]
    const room = new LocalRoom()
    const channel = new LocalSync()
    const [first, ...rest] = screens
    const lobby = new Lobby(
        room, channel, "Hôte", make(first).map(def => gameModeAsLobbyMode(def, first, first.timer)),
    )
    const guests = names.map((name, index) => new LobbyGuest(
        room.join(`c${index}`), channel, name, make(rest[index]).map(def => gameModeAsLobbyMode(def, rest[index], rest[index].timer)),
    ))
    return { screens, lobby, guests, room, channel, make }
}

describe("run modes of a table in a lobby", () => {
    test("coop → the host plays a new run, a client plays a hero by its side, and both are shut at the end", async() => {
        const { screens, lobby, guests } = table(screen => [runTableMode(screen)], "Ana")
        expect(lobby.start()).toBeNull()
        await settle()
        const [host, ana] = screens
        // The host's run is the one it shows; the client holds a replica of it.
        expect(host.owned.length).toBeGreaterThan(0)
        expect(host.owned.at(-1)?.run).toBe(host.runs[0])
        expect(guests[0].playing).toBe(true)
        // The client came to play: it was dealt a hero, which the host does not play.
        const dealt = ana.seats.at(-1) ?? []
        expect(dealt.length).toBeGreaterThan(0)
        expect(host.owned.at(-1)?.isGuests({ name: dealt[0] })).toBe(true)
        lobby.stop()
        expect(host.hidden).toBeGreaterThan(0)
        expect(ana.hidden).toBeGreaterThan(0)
        expect(guests[0].playing).toBe(false)
    })

    test("a battle of the table → the round starts on the host's screen once the host and its client are both ready", async() => {
        const { screens, lobby } = table(screen => [runTableMode(screen)], "Ana")
        lobby.start()
        await settle()
        const [host, ana] = screens
        fight(host.runs[0])
        await settle()
        const battle = ana.runs[0].battle as Battle
        const mine = new Set(ana.seats.at(-1))
        expect(mine.size).toBeGreaterThan(0)
        // The client commits what a bot would for its units, and says it is ready: the host still waits for
        // itself.
        for(const unit of battle.awaited.units){
            if(mine.has(unit.name)) battle.commitPlan(unit, battle.planAsBot(unit))
        }
        ana.readies.at(-1)?.()
        await settle()
        expect(host.rounds).toBe(0)
        const own = host.runs[0].battle as Battle
        for(const unit of own.awaited.units){
            if(!mine.has(unit.name)) own.commitPlan(unit, own.planAsBot(unit))
        }
        host.owned.at(-1)?.ready()
        await settle()
        expect(host.rounds).toBe(1)
    })

    test("a client that quits the game → back in the lobby, its seats given back, and it may play again", async() => {
        const { screens, lobby, guests } = table(screen => [runTableMode(screen)], "Ana")
        lobby.start()
        await settle()
        const [, ana] = screens
        expect(guests[0].quitGame()).toBe(true)
        await settle()
        expect(guests[0].playing).toBe(false)
        expect(guests[0].gameGoing).toBe(true)
        expect(lobby.playing).toBe(true)
        expect(ana.hidden).toBeGreaterThan(0)
        // The seats it left are given back: the host does not hold them for it.
        expect(screens[0].owned.at(-1)?.isGuests({ name: ana.seats.at(-1)?.[0] ?? "" })).toBe(false)
        guests[0].rejoin()
        await settle()
        expect(guests[0].playing).toBe(true)
        expect((ana.seats.at(-1) ?? []).length).toBeGreaterThan(0)
    })

    test("the party falls on the host → the game is over, and the lobby is free again", async() => {
        const { screens, lobby } = table(screen => [runTableMode(screen)])
        lobby.start()
        await settle()
        screens[0].owned.at(-1)?.over()
        await settle()
        expect(lobby.playing).toBe(false)
        expect(screens[0].hidden).toBeGreaterThan(0)
        expect(lobby.selection.playing).toBe(false)
    })

    test("a client that comes late → watches: shown the run, never given a unit", async() => {
        const { screens, lobby, room, channel, make } = table(screen => [runTableMode(screen)])
        lobby.start()
        await settle()
        const late = new Screen()
        // The mode has a setting for each client: it waits for its click before it joins.
        const guest = new LobbyGuest(room.join("late"), channel, "Tard", [gameModeAsLobbyMode(make(late)[0], late, late.timer)])
        await settle()
        guest.rejoin()
        await settle()
        expect(late.seats.length).toBeGreaterThan(0)
        expect(late.seats.every(units => units.length === 0)).toBe(true)
        expect(screens[0].owned.at(-1)?.isGuests({ name: "anything" })).toBe(false)
    })

    test("enemy players → a setting of the mode, with the places set to random", async() => {
        const { screens, lobby } = table(screen => [runTableMode(screen)])
        expect(lobby.selection.set("joueurs", "ennemis")).toBeNull()
        expect(lobby.selection.set("places", "aléatoires")).toBeNull()
        expect(lobby.start()).toBeNull()
        await settle()
        expect(screens[0].owned.length).toBeGreaterThan(0)
        lobby.dispose()
        expect(screens[0].hidden).toBeGreaterThan(0)
    })
})

describe("run modes of a table, at their edges", () => {
    /** The units a screen plays, the first time it was dealt some. */
    const dealt = (screen: Screen): Set<string> => {
        return new Set([...screen.seats].reverse().find(units => units.length > 0))
    }

    /** Commit what a bot would for the units of a battle that are not in the set. */
    function planOthers(battle: Battle, mine: ReadonlySet<string>): void {
        for(const unit of battle.awaited.units){
            if(!mine.has(unit.name)) battle.commitPlan(unit, battle.planAsBot(unit))
        }
    }

    test("a client whose connection is lost in a battle → its units planned as bots, the round not waiting for it", async() => {
        const { screens, lobby, room } = table(screen => [runTableMode(screen)], "Ana")
        lobby.start()
        await settle()
        const [host, ana] = screens
        fight(host.runs[0])
        await settle()
        const battle = host.runs[0].battle as Battle
        room.drop("c0")
        await settle()
        planOthers(battle, dealt(ana))
        host.owned.at(-1)?.ready()
        await settle()
        expect(host.rounds).toBe(1)
        room.back("c0")
        await settle()
        expect(host.reports).toEqual([])
    })

    test("a client that quits in a battle of the party → its heroes are the host's again, and the round goes on", async() => {
        const { screens, lobby, guests } = table(screen => [runTableMode(screen)], "Ana")
        lobby.start()
        await settle()
        const [host, ana] = screens
        fight(host.runs[0])
        await settle()
        const battle = host.runs[0].battle as Battle
        const units = dealt(ana)
        expect(units.size).toBeGreaterThan(0)
        for(const unit of battle.units) if(units.has(unit.name)) expect(unit.controller).toBe("player")
        guests[0].quitGame()
        await settle()
        expect(host.owned.at(-1)?.isGuests({ name: [...units][0] })).toBe(false)
        planOthers(battle, new Set())
        host.owned.at(-1)?.ready()
        await settle()
        expect(host.rounds).toBe(1)
    })

    test("a client that quits in a battle of the enemies → its enemies are bots again, no longer possessed", async() => {
        const { screens, lobby, guests } = table(screen => [runTableMode(screen)], "Ana")
        lobby.selection.set("joueurs", "ennemis")
        lobby.selection.set("places", "aléatoires")
        lobby.start()
        await settle()
        const [host, ana] = screens
        fight(host.runs[0])
        await settle()
        const battle = host.runs[0].battle as Battle
        const units = dealt(ana)
        expect(units.size).toBeGreaterThan(0)
        guests[0].quitGame()
        await settle()
        for(const unit of battle.units) if(units.has(unit.name)) expect(unit.controller).toBe("bot")
        planOthers(battle, new Set())
        host.owned.at(-1)?.ready()
        await settle()
        expect(host.rounds).toBe(1)
    })

    test("two clients → each given a hero of its own, and no more than the host leaves them", async() => {
        const { screens, lobby } = table(screen => [runTableMode(screen)], "Ana", "Bob")
        lobby.start()
        await settle()
        const [host, ana, bob] = screens
        const anas = dealt(ana)
        const bobs = dealt(bob)
        for(const name of anas) expect(bobs.has(name)).toBe(false)
        expect(anas.size + bobs.size).toBeLessThanOrEqual(host.runs[0].heroes.length - 1)
        for(const name of [...anas, ...bobs]) expect(host.owned.at(-1)?.isGuests({ name })).toBe(true)
    })

    test("enemy mode → a client is given an enemy of the battle, and plays it", async() => {
        const { screens, lobby } = table(screen => [runTableMode(screen)], "Ana")
        lobby.selection.set("joueurs", "ennemis")
        lobby.selection.set("places", "aléatoires")
        lobby.start()
        await settle()
        const [host, ana] = screens
        expect(dealt(ana).size).toBe(0)
        fight(host.runs[0])
        await settle()
        const units = dealt(ana)
        expect(units.size).toBeGreaterThan(0)
        const battle = host.runs[0].battle as Battle
        for(const name of units){
            expect(battle.units.find(unit => unit.name === name)?.controller).toBe("player")
        }
    })

    test("mixed mode → an ally is given a hero, an enemy an enemy of the battle, by what each set for itself", async() => {
        const screens = [new Screen(), new Screen(), new Screen()]
        const [host, ana, bob] = screens
        const room = new LocalRoom()
        const channel = new LocalSync()
        const modes = (screen: Screen) => [gameModeAsLobbyMode(runTableMode(screen), screen, screen.timer)]
        const lobby = new Lobby(room, channel, "Hôte", modes(host))
        expect(lobby.selection.set("joueurs", "au choix")).toBeNull()
        const mode = modes(bob)[0]
        const camp = mode.participantSettings?.[0]
        expect(camp?.id).toBe("camp")
        const choices = new ParticipantChoices()
        if(camp) choices.set(mode, camp, "ennemi")
        new LobbyGuest(room.join("c0"), channel, "Ana", modes(ana))
        new LobbyGuest(room.join("c1"), channel, "Bob", modes(bob), choices)
        expect(lobby.start()).toBeNull()
        await settle()
        // In the journey, Ana plays a hero and Bob has nothing yet.
        expect(dealt(ana).size).toBeGreaterThan(0)
        expect(dealt(bob).size).toBe(0)
        fight(host.runs[0])
        await settle()
        const battle = host.runs[0].battle as Battle
        const bobs = dealt(bob)
        expect(bobs.size).toBeGreaterThan(0)
        for(const name of bobs){
            expect(battle.units.find(unit => unit.name === name)?.team).toBe(host.runs[0].monstersTeam)
        }
        // Ana kept her hero.
        for(const name of dealt(ana)){
            expect(host.runs[0].heroes.some(hero => hero.name === name)).toBe(true)
        }
    })

    test("a client that comes late to a mode with things to set → it waits to join until it says so", async() => {
        const room = new LocalRoom()
        const channel = new LocalSync()
        const first = new Screen()
        const lobby = new Lobby(room, channel, "Hôte", [gameModeAsLobbyMode(runTableMode(first), first, first.timer)])
        lobby.start()
        await settle()
        const late = new Screen()
        const guest = new LobbyGuest(room.join("late"), channel, "Tard", [gameModeAsLobbyMode(runTableMode(late), late, late.timer)])
        await settle()
        expect(guest.playing).toBe(false)
        expect(guest.gameGoing).toBe(true)
        guest.rejoin()
        await settle()
        expect(guest.playing).toBe(true)
    })

    test("the owner says it is ready alone, with nobody else to wait for → the round starts at once", async() => {
        const { screens, lobby } = table(screen => [runTableMode(screen)])
        lobby.start()
        await settle()
        const [host] = screens
        fight(host.runs[0])
        await settle()
        planOthers(host.runs[0].battle as Battle, new Set())
        host.owned.at(-1)?.ready()
        await settle()
        expect(host.rounds).toBe(1)
    })

})
