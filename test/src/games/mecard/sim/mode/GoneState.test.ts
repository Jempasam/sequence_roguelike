import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import { LocalGame } from "@game/core-src/games/mecard/sim/mode/local/LocalGame"
import { LifeBook, LivesReceiver } from "@game/core-src/games/mecard/sim/mode/subs/duelRace/LifeBook"
import { Bracket } from "@game/core-src/games/mecard/sim/mode/subs/tournament/Bracket"
import { tournamentMode } from "@game/core-src/games/mecard/sim/mode/subs/tournament/TournamentMode"
import { LocalSync } from "@game/core-src/games/mecard/sync/SyncChannel"
import type { BracketView } from "@game/core-src/games/mecard/sim/mode/subs/tournament/Bracket"
import type { TournamentBench } from "@game/core-src/games/mecard/sim/mode/subs/tournament/TournamentOwner"
import { describe, expect, test } from "vitest"

import { bracketCells } from "../../../../../../core/src/games/mecard/ui/duel/BracketPanel"

async function settle(): Promise<void> {
    for(let turn = 0; turn < 40; turn++) await Promise.resolve()
}

describe("a player that left a bracket", () => {
    test("marked as gone → told in the view, and still there to be read", () => {
        const bracket = new Bracket(["a", "b", "c", "d"], new Rng(1))
        expect(bracket.view().gone).toEqual([])
        bracket.markGone("b")
        bracket.markGone("b")
        expect(bracket.view().gone).toEqual(["b"])
        expect(bracket.view().rounds[0].matches.flatMap(match => [match.first, match.second])).toContain("b")
    })

    test("the cells of a bracket → no name for a player that is gone, and its match greyed", () => {
        const view: BracketView = {
            rounds: [{ title: "Finale", matches: [{ id: 0, first: "a", second: "b", winner: null }] }],
            champion: null,
            gone: ["b"],
        }
        const cells = bracketCells(view, id => `Nom-${id}`).cells
        expect(cells[1].text).toBe("> Nom-a - ???")
        expect(cells[1].dim).toBe(true)
        const none = bracketCells({ ...view, gone: [] }, id => `Nom-${id}`).cells
        expect(none[1].text).toBe("> Nom-a - Nom-b")
        expect(none[1].dim).toBe(false)
    })
})

describe("a player that left a race", () => {
    test("left → out at once, told as gone to the screens, and a player that is out only is not gone", () => {
        const channel = new LocalSync()
        const book = new LifeBook(["a", "b", "c"], 2, channel)
        const receiver = new LivesReceiver(channel)
        book.lose("c")
        book.lose("c")
        book.leave("b")
        book.leave("b")
        expect(book.isGone("b")).toBe(true)
        expect(book.livesOf("b")).toBe(0)
        expect(book.alive()).toEqual(["a"])
        expect(receiver.isGone("b")).toBe(true)
        expect(receiver.livesOf("b")).toBe(0)
        // Out of lives, but it did not leave: it keeps its name.
        expect(book.isGone("c")).toBe(false)
        expect(receiver.isGone("c")).toBe(false)
        expect(book.isGone("zz")).toBe(false)
    })

    test("a player that left while out of lives → gone all the same", () => {
        const channel = new LocalSync()
        const book = new LifeBook(["a", "b"], 1, channel)
        const receiver = new LivesReceiver(channel)
        book.lose("b")
        book.leave("b")
        expect(receiver.isGone("b")).toBe(true)
    })
})

describe("a tournament that loses a player", () => {
    test("the bracket it publishes tells who is gone", async() => {
        const bracketsSeen: BracketView[] = []
        const shown: Battle[] = []
        const bench: TournamentBench = {
            report: () => {},
            showBattle: battle => void shown.push(battle),
            showBracket: bracket => void bracketsSeen.push(bracket),
            hideBracket: () => {},
        }
        const game = new LocalGame(tournamentMode(bench), { manches: 1 }, {
            clock: new ManualScheduler(), rng: new Rng(2), announce: () => {}, report: () => {},
        })
        void game.join("a", "Ana")
        void game.join("b", "Bob")
        void game.join("c", "Cléo")
        game.start()
        for(let turn = 0; turn < 20 && bracketsSeen.length === 0; turn++) await settle()
        expect(bracketsSeen.length).toBeGreaterThan(0)
        game.manager.quit("c")
        await settle()
        expect(bracketsSeen.at(-1)?.gone).toEqual(["c"])
        game.dispose()
    })
})
