import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import { DraftBoard } from "@game/core-src/games/mecard/sim/mode/subs/draft/DraftBoard"
import { draftMode } from "@game/core-src/games/mecard/sim/mode/subs/draft/DraftMode"
import { TOURNAMENT_PAUSE_MS } from "@game/core-src/games/mecard/sim/mode/subs/tournament/TournamentManager"
import { Lobby } from "@game/core-src/games/mecard/sync/lobby/Lobby"
import { LobbyGuest } from "@game/core-src/games/mecard/sync/lobby/LobbyGuest"
import { gameModeAsLobbyMode } from "@game/core-src/games/mecard/sync/mode/gameModeAsLobbyMode"
import { LocalRoom, LocalSync } from "@game/core-src/games/mecard/sync/SyncChannel"
import type { Prompt } from "@game/core-src/games/mecard/sim/mode/subs/choose/Picker"
import type { DraftBench } from "@game/core-src/games/mecard/sim/mode/subs/draft/DraftMode"
import type { BracketView } from "@game/core-src/games/mecard/sim/mode/subs/tournament/Bracket"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 30; turn++) await Promise.resolve()
}

/** The screen of one client: what it was asked to pick, the battles it was shown, and the brackets told. */
class Screen implements DraftBench {


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
        this.#choose = () => choose(prompt.options[0])
    }

    public hidePrompt(): void {
        this.#choose = null
    }

    public report(text: string): void {
        this.reports.push(text)
    }

    /** Pick the first kit offered, if a question is on, and plan what a bot would for the units it plays. */
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

describe("the draft board", () => {
    test("the players pick in a snake order, each kit going to the one that takes it", () => {
        const board = new DraftBoard(["a", "b", "c"], ["k1", "k2", "k3", "k4", "k5", "k6"], 2)
        const turns: string[] = []
        for(let kit = 1; board.turn !== null; kit++){
            turns.push(board.turn)
            expect(board.pick(board.turn, `k${kit}`)).toBeNull()
        }
        expect(turns).toEqual(["a", "b", "c", "c", "b", "a"])
        expect(board.picksOf("c")).toEqual(["k3", "k4"])
        expect(board.pool).toHaveLength(0)
    })

    test("a pick out of turn, of a kit that is gone, or after the end, is refused", () => {
        const board = new DraftBoard(["a", "b"], ["k1", "k2"], 1)
        expect(board.pick("b", "k1")).not.toBeNull()
        expect(board.pick("a", "k9")).not.toBeNull()
        expect(board.pick("a", "k1")).toBeNull()
        expect(board.pick("b", "k1")).not.toBeNull()
        expect(board.pick("b", "k2")).toBeNull()
        expect(board.pick("a", "k2")).not.toBeNull()
        expect(new DraftBoard(["a"], [], 1).turn).toBeNull()
    })
})

describe("the draft mode", () => {
    test("three players pick their kits in turn, and the teams they made fight a tournament to its champion", async() => {
        const timer = new ManualScheduler()
        const screens = [new Screen(timer), new Screen(timer), new Screen(timer)]
        const [host, ana, bob] = screens.map(screen => [gameModeAsLobbyMode(draftMode(screen), screen, screen.timer)])
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
        for(let turn = 0; turn < 8000 && screens[0].brackets.at(-1)?.champion == null; turn++){
            for(const screen of screens) screen.act()
            await settle()
            if(turn % 20 === 19) timer.advance(TOURNAMENT_PAUSE_MS + 1)
        }
        // Each client was asked, in turn, what to pick, and only what it picks: 2 kits each by default.
        expect(screens.every(screen => screen.prompts.length === 2)).toBe(true)
        const asked = screens.flatMap(screen => screen.prompts)
        expect(new Set(asked.map(prompt => prompt.who)).size).toBe(3)
        // Six questions in all, and what was offered shrinks by one at each of them.
        expect(asked.map(prompt => prompt.options.length).sort((a, b) => b - a)).toEqual([12, 11, 10, 9, 8, 7])
        for(const screen of screens) expect(screen.brackets.at(-1)?.champion).not.toBeNull()
        lobby.stop()
    })
})
