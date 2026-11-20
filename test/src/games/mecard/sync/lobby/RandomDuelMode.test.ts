import { ManualScheduler } from "@game/core"
import type { Battle } from "@game/core/mecard"
import {
    gameModeAsLobbyMode, Lobby, LobbyGuest, LocalRoom, LocalSync, RANDOM_DUEL_PAUSE_MS, randomDuelMode,
} from "@game/core/mecard/sync"
import type { DuelBench } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 30; turn++) await Promise.resolve()
}

/** The screen of one client: the battles it was shown, with what it plays, and what it was told. */
class Screen implements DuelBench {


    public readonly shown: { battle: Battle, units: readonly string[], ready: () => void }[] = []
    public hidden = 0
    public readonly reports: string[] = []

    constructor(public readonly timer: ManualScheduler){}


    public showBattle(battle: Battle, units: readonly string[], ready: () => void): void {
        this.shown.push({ battle, units, ready })
    }

    public hideBattle(): void {
        this.hidden++
    }

    public report(text: string): void {
        this.reports.push(text)
    }

    /** Plan what a bot would for the units it plays, and say it is ready, once a round. */
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

describe("the random duel", () => {
    test("three players → two fight a duel they plan, the third watches it, and all are back once it is over", async() => {
        const timer = new ManualScheduler()
        const screens = [new Screen(timer), new Screen(timer), new Screen(timer)]
        const [host, ana, bob] = screens.map(screen => [gameModeAsLobbyMode(randomDuelMode(screen), screen)])
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
        // The duel is shown to all three, and played by two.
        for(let turn = 0; turn < 500 && screens.some(screen => screen.shown.length === 0 || screen.shown[0].battle.phase !== "over"); turn++){
            for(const screen of screens) screen.act()
            await settle()
        }
        expect(screens.every(screen => screen.shown.length >= 1)).toBe(true)
        const players = screens.filter(screen => screen.shown[0].units.length > 0)
        expect(players).toHaveLength(2)
        expect(screens[0].shown[0].battle.phase).toBe("over")
        // Once the players read who won, the duel is taken off every screen.
        timer.advance(RANDOM_DUEL_PAUSE_MS + 1)
        await settle()
        expect(screens.every(screen => screen.hidden >= 1)).toBe(true)
        lobby.stop()
    })
})
