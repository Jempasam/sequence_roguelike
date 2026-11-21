import { ManualScheduler } from "@game/core"
import { Rng } from "@game/core/mecard"
import type { Battle } from "@game/core/mecard"
import { draftMode, LocalGame, TOURNAMENT_PAUSE_MS } from "@game/core/mecard/sync"
import type { BracketView, DraftBench, Prompt } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

async function settle(): Promise<void> {
    for(let turn = 0; turn < 40; turn++) await Promise.resolve()
}

/** The one screen of a local game: it picks the first kit offered, and plays what a bot would. */
class Screen implements DraftBench {


    public readonly prompts: Prompt[] = []
    public readonly brackets: BracketView[] = []
    public readonly reports: string[] = []
    public readonly shown: { battle: Battle, units: readonly string[], ready: () => void }[] = []

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

    /** Answer the question on, and plan for the units of every battle shown, once a round. */
    public act(): void {
        this.#choose?.()
        this.#choose = null
        for(const each of this.shown){
            if(each.units.length === 0 || each.battle.phase !== "preparation") continue
            const key = `${this.shown.indexOf(each)}:${each.battle.round}`
            if(this.#planned.has(key)) continue
            this.#planned.add(key)
            const mine = new Set(each.units)
            for(const unit of each.battle.awaited.units){
                if(mine.has(unit.name)) each.battle.commitPlan(unit, each.battle.planAsBot(unit))
            }
            each.ready()
        }
    }


    #choose: (() => void)|null = null
    readonly #planned = new Set<string>()
}

describe("a draft, played with no network", () => {
    test("three members pick their kits in turn, and the teams they made fight a tournament to its champion", async() => {
        const screen = new Screen()
        const clock = new ManualScheduler()
        const reports: string[] = []
        const game = new LocalGame(draftMode(screen), { kits: 2, pool: 12, delai: 20, manches: 1 }, {
            clock, rng: new Rng(11), announce: () => {}, report: text => reports.push(text),
        })
        void game.join("a", "Ana")
        void game.join("b", "Bob")
        void game.join("c", "Cléo")
        game.start()
        await settle()
        for(let turn = 0; turn < 8000 && screen.brackets.at(-1)?.champion == null; turn++){
            screen.act()
            await settle()
            if(turn % 20 === 19) clock.advance(TOURNAMENT_PAUSE_MS + 1)
        }
        expect(reports).toEqual([])
        // Six questions in all (2 kits each), each one shorter than the one before.
        expect(screen.prompts).toHaveLength(6)
        expect(screen.prompts.map(prompt => prompt.options.length)).toEqual([12, 11, 10, 9, 8, 7])
        expect(new Set(screen.prompts.map(prompt => prompt.who)).size).toBe(3)
        expect(screen.brackets.at(-1)?.champion).not.toBeNull()
        game.dispose()
    })
})
