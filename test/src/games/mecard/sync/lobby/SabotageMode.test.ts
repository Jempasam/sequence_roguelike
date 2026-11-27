import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import { SABOTAGES } from "@game/core-src/games/mecard/sim/duel/sabotage"
import { sabotageMode, SPARE } from "@game/core-src/games/mecard/sim/mode/subs/sabotage/SabotageMode"
import { TOURNAMENT_PAUSE_MS } from "@game/core-src/games/mecard/sim/mode/subs/tournament/TournamentManager"
import { Lobby } from "@game/core-src/games/mecard/sync/lobby/Lobby"
import { LobbyGuest } from "@game/core-src/games/mecard/sync/lobby/LobbyGuest"
import { gameModeAsLobbyMode } from "@game/core-src/games/mecard/sync/mode/gameModeAsLobbyMode"
import { LocalRoom, LocalSync } from "@game/core-src/games/mecard/sync/SyncChannel"
import type { Prompt } from "@game/core-src/games/mecard/sim/mode/subs/choose/Picker"
import type { SabotageBench } from "@game/core-src/games/mecard/sim/mode/subs/sabotage/SabotageMode"
import type { BracketView } from "@game/core-src/games/mecard/sim/mode/subs/tournament/Bracket"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 30; turn++) await Promise.resolve()
}

/** The screen of one client: the questions it was put, the battles it was shown, and the brackets told. */
class Screen implements SabotageBench {


    public readonly shown: { battle: Battle, units: readonly string[], ready: () => void }[] = []
    public readonly brackets: BracketView[] = []
    public readonly prompts: Prompt[] = []
    public readonly reports: string[] = []

    constructor(public readonly timer: ManualScheduler){}


    public showBattle(battle: Battle, units: readonly string[], ready: () => void): void {
        this.shown.push({ battle, units, ready })
    }

    public hideBattle(): void {}

    public showBracket(bracket: BracketView): void {
        this.brackets.push(bracket)
    }

    public hideBracket(): void {}

    public showPrompt(prompt: Prompt, _context: unknown, choose: (option: string) => void): void {
        this.prompts.push(prompt)
        // A saboteur that does harm: the first thing it may do to a fighter, not the option that spares.
        this.#choose = () => choose(prompt.options.find(option => option !== SPARE) ?? SPARE)
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

describe("the sabotages", () => {
    test("each makes a team that still stands, and wounds never empty the last heart", () => {
        const heart = (empty: boolean): readonly [string, boolean] => ["Cœur rouge", empty]
        const unit = { name: "u", hearts: [heart(false), heart(false), heart(true)], items: ["a", "b"] } as never
        for(const sabotage of SABOTAGES){
            const [changed] = sabotage.apply([unit]) as unknown as { hearts: [string, boolean][] }[]
            expect(changed.hearts.some(([, empty]) => !empty)).toBe(true)
        }
    })
})

describe("the tournament of saboteurs", () => {
    test("four players → those out of a match are asked to sabotage, and the tournament still has its champion", async() => {
        const timer = new ManualScheduler()
        const screens = [new Screen(timer), new Screen(timer), new Screen(timer), new Screen(timer)]
        const [host, ana, bob, cat] = screens.map(screen => {
            return [gameModeAsLobbyMode(sabotageMode(screen), screen, screen.timer)]
        })
        const room = new LocalRoom()
        const channel = new LocalSync()
        const lobby = new Lobby(room, channel, "Hôte", host)
        const guests = [
            new LobbyGuest(room.join("a"), channel, "Ana", ana),
            new LobbyGuest(room.join("b"), channel, "Bob", bob),
            new LobbyGuest(room.join("c"), channel, "Cat", cat),
        ]
        expect(lobby.start()).toBeNull()
        await settle()
        expect(guests.every(guest => guest.playing)).toBe(true)
        for(let turn = 0; turn < 8000 && screens[0].brackets.at(-1)?.champion == null; turn++){
            for(const screen of screens) screen.act()
            await settle()
            if(turn % 20 === 19) timer.advance(TOURNAMENT_PAUSE_MS + 1)
        }
        for(const screen of screens) expect(screen.brackets.at(-1)?.champion).not.toBeNull()
        // The final has two watchers: they were asked, and every question offered sparing and doing harm.
        const asked = screens.flatMap(screen => screen.prompts)
        expect(asked.length).toBeGreaterThan(0)
        expect(asked.every(prompt => prompt.options.includes(SPARE) && prompt.options.length > 1)).toBe(true)
        lobby.stop()
    })
})
