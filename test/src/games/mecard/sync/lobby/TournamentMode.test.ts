import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import {
    TOURNAMENT_LINGER_MS,
    TOURNAMENT_PAUSE_MS,
} from "@game/core-src/games/mecard/sim/mode/subs/tournament/TournamentManager"
import { tournamentMode } from "@game/core-src/games/mecard/sim/mode/subs/tournament/TournamentMode"
import { Lobby } from "@game/core-src/games/mecard/sync/lobby/Lobby"
import { LobbyGuest } from "@game/core-src/games/mecard/sync/lobby/LobbyGuest"
import { gameModeAsLobbyMode } from "@game/core-src/games/mecard/sync/mode/gameModeAsLobbyMode"
import { LocalRoom, LocalSync } from "@game/core-src/games/mecard/sync/SyncChannel"
import type { BracketView } from "@game/core-src/games/mecard/sim/mode/subs/tournament/Bracket"
import type { TournamentBench } from "@game/core-src/games/mecard/sim/mode/subs/tournament/TournamentOwner"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 30; turn++) await Promise.resolve()
}

/** The screen of one client: the battles it was shown and the brackets it was told. */
class Screen implements TournamentBench {


    public readonly shown: { battle: Battle, units: readonly string[], ready: () => void }[] = []
    public readonly brackets: BracketView[] = []
    public hiddenBracket = 0
    public watch: ((match: number) => void)|null = null
    public readonly reports: string[] = []

    constructor(public readonly timer: ManualScheduler){}


    public showBattle(battle: Battle, units: readonly string[], ready: () => void): void {
        this.shown.push({ battle, units, ready })
    }

    public hideBattle(): void {}

    public showBracket(bracket: BracketView, watch: (match: number) => void): void {
        this.brackets.push(bracket)
        this.watch = watch
    }

    public hideBracket(): void {
        this.hiddenBracket++
    }

    public report(text: string): void {
        this.reports.push(text)
    }

    /** Plan what a bot would for the units it plays, and say it is ready, once a round of a battle. */
    public act(): void {
        const last = this.shown.at(-1)
        if(!last || last.units.length === 0) return
        const { battle } = last
        if(battle.phase !== "preparation") return
        const key = `${this.shown.length}:${battle.round}`
        if(this.#round === key) return
        this.#round = key
        const mine = new Set(last.units)
        for(const unit of battle.awaited.units){
            if(mine.has(unit.name)) battle.commitPlan(unit, battle.planAsBot(unit))
        }
        last.ready()
    }


    #round = ""
}

describe("the tournament", () => {
    test("three players → a bracket of two rounds is played to its champion, and told to everyone", async() => {
        const timer = new ManualScheduler()
        const screens = [new Screen(timer), new Screen(timer), new Screen(timer)]
        const [host, ana, bob] = screens.map(screen => [gameModeAsLobbyMode(tournamentMode(screen), screen, screen.timer)])
        const room = new LocalRoom()
        const channel = new LocalSync()
        const lobby = new Lobby(room, channel, "Hôte", host)
        const guests = [
            new LobbyGuest(room.join("a"), channel, "Ana", ana),
            new LobbyGuest(room.join("b"), channel, "Bob", bob),
        ]
        expect(lobby.start()).toBeNull()
        await settle()
        expect(guests.every(guest => guest.playing)).toBe(true)
        // Play until the bracket the first client is told has a champion: a big cap, never a count of rounds.
        for(let turn = 0; turn < 5000 && screens[0].brackets.at(-1)?.champion == null; turn++){
            for(const screen of screens) screen.act()
            await settle()
            if(turn % 20 === 19) timer.advance(TOURNAMENT_PAUSE_MS + 1)
        }
        for(const screen of screens){
            const last = screen.brackets.at(-1)
            expect(last?.champion).not.toBeNull()
            expect(last?.rounds).toHaveLength(2)
            expect(last?.rounds[0].matches).toHaveLength(2)
            expect(last?.rounds[1].matches).toHaveLength(1)
        }
        const champions = new Set(screens.map(screen => screen.brackets.at(-1)?.champion))
        expect(champions.size).toBe(1)
        // Every player was shown a battle: the one that went through the first round watched one then.
        expect(screens.every(screen => screen.shown.length >= 1)).toBe(true)
        // Once the players read who won, the bracket is taken off every screen.
        timer.advance(TOURNAMENT_LINGER_MS + 1)
        await settle()
        expect(screens.every(screen => screen.hiddenBracket >= 1)).toBe(true)
        lobby.stop()
    })
})
