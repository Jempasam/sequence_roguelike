import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import { LANCER_KIT, SWORDSMAN_KIT } from "@game/core-src/games/mecard/sim/catalog/kits"
import { GOBLIN } from "@game/core-src/games/mecard/sim/catalog/monsters"
import { CAVE_FLOOR } from "@game/core-src/games/mecard/sim/floor/subs/CaveFloor"
import { DUEL_HALT } from "@game/core-src/games/mecard/sim/halt/subs/duel/DuelHalt"
import { Run } from "@game/core-src/games/mecard/sim/run/Run"
import type { FloorType } from "@game/core-src/games/mecard/sim/floor/Floor"
import {
    BUILDER_OVER_LINGER_MS,
} from "@game/core-src/games/mecard/sim/mode/subs/monsterBuilder/MonsterBuilderManager"
import {
    monsterBuilderMode,
} from "@game/core-src/games/mecard/sim/mode/subs/monsterBuilder/MonsterBuilderMode"
import { Lobby } from "@game/core-src/games/mecard/sync/lobby/Lobby"
import { LobbyGuest } from "@game/core-src/games/mecard/sync/lobby/LobbyGuest"
import { gameModeAsLobbyMode } from "@game/core-src/games/mecard/sync/mode/gameModeAsLobbyMode"
import { LocalRoom, LocalSync } from "@game/core-src/games/mecard/sync/SyncChannel"
import type {
    RaceScreen,
    RaceTableBench,
} from "@game/core-src/games/mecard/sim/mode/subs/duelRace/DuelRaceOwner"
import type {
    DuelRacePlayer,
} from "@game/core-src/games/mecard/sim/mode/subs/duelRace/players/DuelRacePlayer"
import type { DuelAccess } from "@game/core-src/games/mecard/sim/mode/subs/duelRace/players/HubPort"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 40; turn++) await Promise.resolve()
}

/** The screen of one client: the runs it was given, the players it follows, what it was told. */
class Screen implements RaceTableBench {


    public readonly screens: { run: Run, floor: FloorType|null, followed: DuelRacePlayer[] }[] = []
    public readonly reports: string[] = []
    public readonly access: DuelAccess[] = []

    constructor(public readonly timer: ManualScheduler){}


    public race(firstFloor: FloorType|null): RaceScreen {
        const run = new Run(this.screens.length + 1, undefined, firstFloor ?? undefined)
        run.hire(LANCER_KIT)
        run.hire(SWORDSMAN_KIT)
        const record = { run, floor: firstFloor, followed: [] as DuelRacePlayer[] }
        this.screens.push(record)
        return {
            run,
            follow: player => {
                record.followed.push(player)
                player.fighting.add(duel => this.access.push(duel))
                player.watching.add(duel => this.access.push(duel))
            },
            close: () => {},
        }
    }

    public report(text: string): void {
        this.reports.push(text)
    }

    /** Plan what a bot would for the units the player plays in its duel, and say it is ready, once a round. */
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

    /** The player this screen follows. */
    public get player(): DuelRacePlayer {
        return this.screens[0].followed[0]
    }

    public get run(): Run {
        return this.screens[0].run
    }


    #round = ""
}

/** A lobby of a host and two clients, each with a screen of its own. */
function lobbyOf(clients = 2) {
    const timer = new ManualScheduler()
    const screens = Array.from({ length: clients + 1 }, () => new Screen(timer))
    const room = new LocalRoom()
    const channel = new LocalSync()
    const lobby = new Lobby(
        room, channel, "Hôte", [gameModeAsLobbyMode(monsterBuilderMode(screens[0]), screens[0], timer)],
    )
    const guests = Array.from({ length: clients }, (_, index) => new LobbyGuest(
        room.join(`c${index}`), channel, `Joueur ${index}`,
        [gameModeAsLobbyMode(monsterBuilderMode(screens[index + 1]), screens[index + 1], timer)],
    ))
    return { timer, screens, lobby, guests, room }
}

/** A lobby started with the host as the only hero, and a monster in the army of each necromancer. */
async function started() {
    const made = lobbyOf()
    made.lobby.selection.set("heros", 1)
    expect(made.lobby.start()).toBeNull()
    await settle()
    for(const screen of made.screens.slice(1)) screen.run.recruit(GOBLIN)
    return made
}

describe("the monster builder, in a lobby", () => {
    test("each part its run → the hero a usual map of duels, the necromancers a floor of their own, with no hero", async() => {
        const { screens } = await started()
        const [hero, ...necros] = screens
        expect(hero.screens[0].floor).toBeNull()
        const places = hero.run.travel.journey.places
        expect(places.some(place => place.fight !== null)).toBe(false)
        expect(places.some(place => place.halt === DUEL_HALT)).toBe(true)
        for(const necro of necros){
            expect(necro.screens[0].floor?.name).toBe("Antre du nécromancien")
            const own = necro.run.travel.journey
            expect(own.places.some(place => place.fight !== null)).toBe(false)
            expect(own.places.some(place => place.halt === DUEL_HALT)).toBe(true)
        }
    })

    test("a hero and necromancers at the duels → one necromancer fights the hero, the other watches, then all go on", async() => {
        const { screens } = await started()
        for(const screen of screens) screen.player.contestant.kick()
        await settle()
        for(let turn = 0; turn < 400 && screens[0].player.contestant.waitingAt !== null; turn++){
            for(const screen of screens) screen.act()
            await settle()
        }
        const [hero, first, second] = screens
        expect(hero.player.contestant.waitingAt).toBeNull()
        const fighting = [first, second].filter(screen => screen.access.some(duel => duel.units.length > 0))
        const watching = [first, second].filter(screen => screen.access.some(duel => duel.units.length === 0))
        expect(hero.access.some(duel => duel.units.length > 0)).toBe(true)
        expect(fighting).toHaveLength(1)
        expect(watching).toHaveLength(1)
        // Only the hero has lives, and the necromancer never loses any.
        expect(hero.player.lives.livesOf("c0")).toBeNull()
        expect(hero.player.lives.livesOf("c1")).toBeNull()
        expect(hero.player.lives.livesOf("host")).toBeLessThanOrEqual(3)
        expect(fighting[0].player.contestant.waitingAt).toBeNull()
    })

    test("a hero at the duels with no necromancer → waits there", async() => {
        const { screens } = await started()
        screens[0].player.contestant.kick()
        await settle()
        expect(screens[0].player.contestant.waitingAt).not.toBeNull()
        expect(screens.every(screen => screen.access.length === 0)).toBe(true)
    })

    test("a hero that leaves → out at once, and the game goes on while another hero is left", async() => {
        const { screens, lobby, room } = lobbyOf()
        lobby.selection.set("heros", 2)
        lobby.start()
        await settle()
        room.leave("c0")
        await settle()
        expect(screens[0].player.lives.livesOf("c0")).toBe(0)
        expect(screens[0].player.lives.livesOf("host")).toBe(3)
        expect(lobby.playing).toBe(true)
    })

    test("no necromancer → the game cannot start", async() => {
        const { lobby, screens } = lobbyOf()
        lobby.selection.set("heros", 3)
        lobby.start()
        await settle()
        expect(lobby.playing).toBe(false)
        expect(screens[0].reports.length).toBeGreaterThan(0)
    })

    test("a hero that goes through its floors → wins", async() => {
        const { timer, screens, lobby } = lobbyOf()
        lobby.selection.set("heros", 1)
        lobby.selection.set("etages", 1)
        lobby.start()
        await settle()
        const won: string[] = []
        screens[1].player.won.add(winner => won.push(winner))
        screens[0].run.travel.enterFloor(CAVE_FLOOR.create(2))
        await settle()
        expect(won).toEqual(["host"])
        timer.advance(BUILDER_OVER_LINGER_MS + 1)
        await settle()
        expect(lobby.playing).toBe(false)
    })
})
