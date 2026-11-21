import { ManualScheduler } from "@game/core"
import type { Battle } from "@game/core/mecard"
import { LOOT_MONSTERS, threatOf, unitsOfMonsters } from "@game/core/mecard"
import {
    dungeonMasterMode, gameModeAsLobbyMode, LAUNCH, Lobby, LobbyGuest, LocalRoom, LocalSync, MASTER_PAUSE_MS,
} from "@game/core/mecard/sync"
import type { MasterBench, Prompt } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 30; turn++) await Promise.resolve()
}

/** The screen of one client: the questions it was put, the battles it was shown and what it was told. */
class Screen implements MasterBench {


    public readonly shown: { battle: Battle, units: readonly string[], ready: () => void }[] = []
    public readonly prompts: Prompt[] = []
    public readonly reports: string[] = []

    constructor(public readonly timer: ManualScheduler){}


    public showBattle(battle: Battle, units: readonly string[], ready: () => void): void {
        this.shown.push({ battle, units, ready })
    }

    public hideBattle(): void {}

    public showPrompt(prompt: Prompt, _context: unknown, choose: (option: string) => void): void {
        this.prompts.push(prompt)
        // Picks the first monster offered after the launch, once, then launches: a master with a small army.
        const monsters = prompt.options.filter(option => option !== LAUNCH)
        this.#choose = () => choose(prompt.options.length > 1 && prompt.title.includes(" 0 monstre") ? monsters[0] : LAUNCH)
    }

    public hidePrompt(): void {
        this.#choose = null
    }

    public report(text: string): void {
        this.reports.push(text)
    }

    public act(): void {
        this.#choose?.()
        this.#choose = null
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
    #choose: (() => void)|null = null
}

describe("the monsters of a master", () => {
    test("each costs some threat, and a group of them makes as many units as there are monsters", () => {
        for(const monster of LOOT_MONSTERS) expect(threatOf(monster)).toBeGreaterThan(0)
        const units = unitsOfMonsters([LOOT_MONSTERS[0], LOOT_MONSTERS[0]])
        expect(units).toHaveLength(2)
        expect(units.map(unit => unit.name)).toEqual([`${LOOT_MONSTERS[0].name} 1`, `${LOOT_MONSTERS[0].name} 2`])
        expect(units.every(unit => unit.controller === "player")).toBe(true)
    })
})

describe("the dungeon master", () => {
    test("a master picks monsters for the heroes, the encounters are fought, and the game ends", async() => {
        const timer = new ManualScheduler()
        const screens = [new Screen(timer), new Screen(timer), new Screen(timer)]
        const [host, ana, bob] = screens.map(screen => {
            return [gameModeAsLobbyMode(dungeonMasterMode(screen), screen, screen.timer)]
        })
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
        // Play until the game is over for the guests: a big cap, never a count of rounds.
        for(let turn = 0; turn < 12000 && guests[0].playing; turn++){
            for(const screen of screens) screen.act()
            await settle()
            if(turn % 20 === 19) timer.advance(MASTER_PAUSE_MS + 1)
        }
        expect(guests[0].playing).toBe(false)
        // The master was asked, and every question offered to launch the fight.
        const asked = screens.flatMap(screen => screen.prompts)
        expect(asked.length).toBeGreaterThan(0)
        expect(asked.every(prompt => prompt.options.includes(LAUNCH))).toBe(true)
        // Every client was shown a battle, the heroes and the master fighting it, the third watching.
        expect(screens.every(screen => screen.shown.length >= 1)).toBe(true)
        lobby.stop()
    })
})
