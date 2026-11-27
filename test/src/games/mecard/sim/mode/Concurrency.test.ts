import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import type { Battle } from "@game/core-src/games/mecard/sim/battle/Battle"
import { Epoch } from "@game/core-src/games/mecard/sim/mode/Epoch"
import { lastOne, LAST_ONE_LINGER_MS } from "@game/core-src/games/mecard/sim/mode/lastOne"
import { LocalGame } from "@game/core-src/games/mecard/sim/mode/local/LocalGame"
import { Settle } from "@game/core-src/games/mecard/sim/mode/Settle"
import { ArrivalWatch } from "@game/core-src/games/mecard/sim/mode/subs/duelRace/ArrivalWatch"
import { randomDuelMode } from "@game/core-src/games/mecard/sim/mode/subs/randomDuel/RandomDuelMode"
import { tournamentMode } from "@game/core-src/games/mecard/sim/mode/subs/tournament/TournamentMode"
import { Deadline } from "@game/core-src/games/mecard/sync/Deadline"
import { LocalSync } from "@game/core-src/games/mecard/sync/SyncChannel"
import type { GameMember } from "@game/core-src/games/mecard/sim/mode/GameMember"
import type { GameModeManager, GameMode } from "@game/core-src/games/mecard/sim/mode/GameMode"
import type { GameModeContext } from "@game/core-src/games/mecard/sim/mode/GameModeContext"
import type { TournamentBench } from "@game/core-src/games/mecard/sim/mode/subs/tournament/TournamentOwner"
import type { Progress } from "@game/core-src/games/mecard/sync/progress/ProgressMessage"
import { describe, expect, test } from "vitest"

async function settle(): Promise<void> {
    for(let turn = 0; turn < 40; turn++) await Promise.resolve()
}

function local(mode: GameMode, values: Record<string, number> = {}) {
    const clock = new ManualScheduler()
    const announced: string[] = []
    const reports: string[] = []
    const game = new LocalGame(mode, values, {
        clock, rng: new Rng(5), announce: text => announced.push(text), report: text => reports.push(text),
    })
    return { game, clock, announced, reports }
}

describe("Settle and Epoch", () => {
    test("a decision settled once → the first source stands, the second is told it came late", () => {
        const decision = new Settle<string>()
        expect(decision.isSettled).toBe(false)
        expect(decision.settle("over")).toBe(true)
        expect(decision.settle("quit")).toBe(false)
        expect(decision.value).toBe("over")
    })

    test("an epoch that moves on → what was registered before it is stale", () => {
        const epoch = new Epoch()
        const token = epoch.current
        expect(epoch.is(token)).toBe(true)
        epoch.next()
        expect(epoch.is(token)).toBe(false)
        expect(epoch.is(epoch.current)).toBe(true)
    })
})

/** A manager that does nothing but give the helper what it asks. */
class Plain implements GameModeManager {


    public ctx!: GameModeContext
    public readonly ending = new Settle<string|null>()

    public run(ctx: GameModeContext): void {
        this.ctx = ctx
    }
}

describe("a time limit and the last arrival, at the same time", () => {
    const there = { atDuel: true } as Progress

    function watched() {
        const timer = new ManualScheduler()
        const deadline = new Deadline(timer, new LocalSync())
        const alive = ["a", "b"]
        const watch = new ArrivalWatch(deadline, 1000, () => alive)
        const all: number[] = []
        const expired: (readonly string[])[] = []
        watch.allArrived.add(() => all.push(1))
        watch.expired.add(late => expired.push(late))
        return { timer, watch, all, expired }
    }

    test("the last one arrives, then the time comes → the round goes on once, for everyone", () => {
        const { timer, watch, all, expired } = watched()
        watch.hear("a", there)
        timer.advance(999)
        watch.hear("b", there)
        timer.advance(10)
        expect(all).toHaveLength(1)
        expect(expired).toEqual([])
    })

    test("the time comes, then the last one arrives → the round goes on once, without it waited for", () => {
        const { timer, watch, all, expired } = watched()
        watch.hear("a", there)
        timer.advance(1000)
        watch.hear("b", there)
        expect(expired).toEqual([["b"]])
        expect(all).toEqual([])
    })
})

describe("the owner of a duel that quits", () => {
    test("in the middle of a random duel → the other fighter is announced as the winner, once, and the game goes on", async() => {
        const shown: { battle: Battle, units: readonly string[] }[] = []
        const bench = {
            report: () => {},
            showBattle: (battle: Battle, units: readonly string[]) => void shown.push({ battle, units }),
        }
        const { game, announced, clock } = local(randomDuelMode(bench))
        void game.join("a", "Ana")
        void game.join("b", "Bob")
        game.start()
        for(let turn = 0; turn < 20 && shown.length === 0; turn++) await settle()
        expect(shown.length).toBeGreaterThan(0)
        // The first fighter owns the duel, and the first to join is a member: both are told the same way.
        const fighters = announced.find(line => line.includes("affronte")) as string
        const owner = fighters.startsWith("Ana") ? "a" : "b"
        game.manager.quit(owner)
        await settle()
        const winner = owner === "a" ? "Bob" : "Ana"
        expect(announced.filter(line => line.startsWith("Vainqueur"))).toEqual([`Vainqueur : ${winner}`])
        void clock
        game.dispose()
    })
})

describe("the last one left", () => {
    test("one member left → it wins once, the game ends after a while; an end that came first stands", async() => {
        const manager = new Plain()
        const { game, clock, announced } = local({
            id: "p", title: "P", description: "", settings: [], manager: () => manager, owner: () => ({}),
        })
        void game.join("a", "Ana")
        void game.join("b", "Bob")
        game.start()
        await settle()
        const isHere = (member: GameMember): boolean => member.connected
        // Two are left: nobody wins.
        expect(lastOne(manager.ctx, isHere, manager.ending)).toBeNull()
        game.manager.quit("b")
        await settle()
        expect(lastOne(manager.ctx, isHere, manager.ending)?.id).toBe("a")
        // Told twice, concluded once.
        expect(lastOne(manager.ctx, isHere, manager.ending)).toBeNull()
        expect(announced.filter(line => line.includes("dernier"))).toHaveLength(1)
        let ended = 0
        game.ended.add(() => ended++)
        clock.advance(LAST_ONE_LINGER_MS + 1)
        await settle()
        expect(ended).toBe(1)
        game.dispose()
    })

    test("the end settled by something else first → the last one does not conclude it again", async() => {
        const manager = new Plain()
        const { game, announced } = local({
            id: "p", title: "P", description: "", settings: [], manager: () => manager, owner: () => ({}),
        })
        void game.join("a", "Ana")
        game.start()
        await settle()
        manager.ending.settle("a")
        expect(lastOne(manager.ctx, member => member.connected, manager.ending)).toBeNull()
        expect(announced).toEqual([])
        game.dispose()
    })
})

describe("what comes at the same time, in a local game", () => {
    test("a join and a quit in the same tick → each told once, the join first", async() => {
        const calls: string[] = []
        const manager: GameModeManager = {
            run: () => {},
            onJoin: (_ctx, who) => { calls.push(`join ${who.id}`); return { kind: "accept" } },
            onQuit: (_ctx, who) => void calls.push(`quit ${who.id}`),
        }
        const { game } = local({ id: "p", title: "P", description: "", settings: [], manager: () => manager, owner: () => ({}) })
        game.start()
        void game.join("a", "Ana")
        game.manager.quit("a")
        game.manager.quit("a")
        await settle()
        expect(calls).toEqual(["join a", "quit a"])
        game.dispose()
    })

    test("a handler that makes the game tell the manager again → told after it returns, never inside it", async() => {
        const log: string[] = []
        let inside = false
        const manager: GameModeManager = {
            run: () => {},
            onQuit: (ctx, who) => {
                expect(inside).toBe(false)
                inside = true
                log.push(`quit ${who.id}`)
                // Calling back in the middle of a handler: the next thing waits for this one to return.
                void ctx
                inside = false
            },
        }
        const { game } = local({ id: "p", title: "P", description: "", settings: [], manager: () => manager, owner: () => ({}) })
        void game.join("a", "Ana")
        void game.join("b", "Bob")
        game.start()
        await settle()
        game.manager.quit("a")
        game.manager.quit("b")
        await settle()
        expect(log).toEqual(["quit a", "quit b"])
        game.dispose()
    })
})

describe("a tournament, played with no network, loses a player", () => {
    test("one of two quits → the one left wins, told once, and the game ends after a while", async() => {
        const shown: Battle[] = []
        const bench: TournamentBench = {
            report: () => {},
            showBattle: battle => void shown.push(battle),
            showBracket: () => {},
            hideBracket: () => {},
        }
        const { game, clock, announced, reports } = local(tournamentMode(bench), { manches: 1 })
        void game.join("a", "Ana")
        void game.join("b", "Bob")
        game.start()
        for(let turn = 0; turn < 20 && shown.length === 0; turn++) await settle()
        expect(reports).toEqual([])
        // The tournament is on: its first match is being fought.
        expect(shown.length).toBeGreaterThan(0)
        game.manager.quit("b")
        await settle()
        expect(announced.filter(line => line.includes("dernier joueur"))).toHaveLength(1)
        let ended = 0
        game.ended.add(() => ended++)
        clock.advance(LAST_ONE_LINGER_MS + 1)
        await settle()
        expect(ended).toBe(1)
        game.dispose()
    })
})
