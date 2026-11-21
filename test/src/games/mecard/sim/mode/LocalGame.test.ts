import { ManualScheduler } from "@game/core"
import { Rng } from "@game/core/mecard"
import type { Battle } from "@game/core/mecard"
import { LocalGame, NoAnswerFault, randomDuelMode } from "@game/core/mecard/sync"
import type {
    GameMember, GameMode, GameModeContext, GameModeManager, GameModeShareable, LocalOptions,
} from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 40; turn++) await Promise.resolve()
}

function options(clock = new ManualScheduler()) {
    const announced: string[] = []
    const reports: string[] = []
    const made: LocalOptions = {
        clock, rng: new Rng(7), announce: text => announced.push(text), report: text => reports.push(text),
    }
    return { clock, announced, reports, made }
}

/** A manager that counts what it is told, and keeps the context it was given. */
class Counting implements GameModeManager {


    public ctx: GameModeContext|null = null
    public readonly calls: string[] = []
    public readonly messages: [string, GameModeShareable][] = []

    public run(ctx: GameModeContext): void {
        this.ctx = ctx
        ctx.joined.add(who => this.calls.push(`joined ${who.id}`))
    }

    public onJoin(_ctx: GameModeContext, who: GameMember): ReturnType<NonNullable<GameModeManager["onJoin"]>> {
        this.calls.push(`join ${who.id}`)
        return { kind: "accept" }
    }

    public onQuit(_ctx: GameModeContext, who: GameMember): void {
        this.calls.push(`quit ${who.id}`)
    }

    public onLost(_ctx: GameModeContext, who: GameMember): void {
        this.calls.push(`lost ${who.id}`)
    }

    public onBack(_ctx: GameModeContext, who: GameMember): void {
        this.calls.push(`back ${who.id}`)
    }

    public onMessage(_ctx: GameModeContext, from: GameMember, message: GameModeShareable): void {
        this.messages.push([from.id, message])
    }
}

/** A mode around a manager, with a client side that keeps what it is told. */
function modeOf(manager: GameModeManager, told: { states: [string, unknown][], orders: unknown[] }): GameMode {
    return {
        id: "counting",
        title: "Counting",
        description: "Counts what it is told.",
        settings: [],
        manager: () => manager,
        owner: () => ({
            onState: (key, value) => void told.states.push([key, value]),
            onOrder: message => void told.orders.push(message),
            onAsk: message => message === "ping" ? "pong" : null,
        }),
    }
}

describe("a game of a mode, on one client", () => {
    test("joins and quits → told once each, a quit only after a join, in order", async() => {
        const { made } = options()
        const manager = new Counting()
        const game = new LocalGame(modeOf(manager, { states: [], orders: [] }), {}, made)
        // Before the mode runs: told to it all the same, once it does.
        void game.join("a", "Ana")
        void game.join("a", "Ana")
        game.start()
        await settle()
        void game.join("b", "Bob")
        game.manager.quit("c")
        game.manager.quit("b")
        game.manager.quit("b")
        await settle()
        expect(manager.calls).toEqual(["join a", "joined a", "join b", "joined b", "quit b"])
        game.dispose()
    })

    test("a connection lost and back → told, without anything of the game closing", async() => {
        const { made } = options()
        const manager = new Counting()
        const game = new LocalGame(modeOf(manager, { states: [], orders: [] }), {}, made)
        void game.join("a", "Ana")
        game.start()
        await settle()
        game.manager.lose("a")
        game.manager.lose("a")
        game.manager.back("a")
        game.manager.back("a")
        await settle()
        expect(manager.calls.slice(-2)).toEqual(["lost a", "back a"])
        expect(manager.ctx?.members()).toHaveLength(1)
        game.dispose()
    })

    test("everything shared goes through JSON → a value that is not shareable arrives as a network would give it", async() => {
        const { made } = options()
        const manager = new Counting()
        const told = { states: [] as [string, unknown][], orders: [] as unknown[] }
        const game = new LocalGame(modeOf(manager, told), {}, made)
        void game.join("a", "Ana")
        game.start()
        await settle()
        const ctx = manager.ctx as GameModeContext
        const member = ctx.members()[0]
        const shared = { n: 1, bad: Number.NaN, who: member, list: [1, null] } as unknown as GameModeShareable
        ctx.publish("k", shared)
        ctx.channel(member).notify(shared)
        await settle()
        expect(told.states[0][1]).toMatchObject({ n: 1, bad: null, list: [1, null] })
        expect((told.states[0][1] as { who: GameMember }).who.id).toBe("a")
        expect(told.orders).toHaveLength(1)
        game.dispose()
    })

    test("a message in each direction → delivered in the order it was sent, and an ask is answered or not", async() => {
        const { made, clock } = options()
        const manager = new Counting()
        const told = { states: [] as [string, unknown][], orders: [] as unknown[] }
        const game = new LocalGame(modeOf(manager, told), {}, made)
        void game.join("a", "Ana")
        game.start()
        await settle()
        const ctx = manager.ctx as GameModeContext
        const member = ctx.members()[0]
        for(const order of [1, 2, 3]) ctx.channel(member).notify(order)
        expect(told.orders).toEqual([])
        await settle()
        expect(told.orders).toEqual([1, 2, 3])
        expect(await ctx.channel(member).ask("ping")).toBe("pong")
        // No handler for this one on the client: the answer is null, not a fault.
        expect(await ctx.channel(member).ask("other")).toBeNull()
        void clock
        game.manager.quit("a")
        await settle()
        const answer = await ctx.channel(member).ask("ping")
        expect(answer).toBeInstanceOf(NoAnswerFault)
        expect((answer as NoAnswerFault).cause).toBe("quit")
        game.dispose()
    })
})

describe("a member whose connection is lost, in a local game", () => {
    async function lost() {
        const { made, clock } = options()
        const manager = new Counting()
        const told = { states: [] as [string, unknown][], orders: [] as unknown[] }
        const game = new LocalGame(modeOf(manager, told), {}, made)
        void game.join("a", "Ana")
        game.start()
        await settle()
        const ctx = manager.ctx as GameModeContext
        const member = ctx.members()[0]
        game.manager.lose("a")
        await settle()
        return { game, ctx, member, told, clock }
    }

    test("told meanwhile → nothing before it is back, then all of it, in the order it was told", async() => {
        const { game, ctx, member, told } = await lost()
        expect(ctx.channel(member).notify("one")).toBeUndefined()
        ctx.channel(member).notify("two")
        await settle()
        expect(told.orders).toEqual([])
        game.manager.back("a")
        await settle()
        expect(told.orders).toEqual(["one", "two"])
        game.dispose()
    })

    test("asked meanwhile → answered once it is back, or too slow with the cause of it", async() => {
        const { game, ctx, member, clock } = await lost()
        const patient = ctx.channel(member).ask("ping")
        const hurried = ctx.channel(member).ask("ping", 1000)
        clock.advance(1001)
        const slow = await hurried
        expect(slow).toBeInstanceOf(NoAnswerFault)
        expect((slow as NoAnswerFault).cause).toBe("timeout")
        game.manager.back("a")
        await settle()
        expect(await patient).toBe("pong")
        game.dispose()
    })

    test("quits meanwhile → what it missed is dropped, and its asks are not heard", async() => {
        const { game, ctx, member, told } = await lost()
        ctx.channel(member).notify("one")
        const asked = ctx.channel(member).ask("ping")
        game.manager.quit("a")
        const answer = await asked
        expect(answer).toBeInstanceOf(NoAnswerFault)
        expect((answer as NoAnswerFault).cause).toBe("quit")
        await settle()
        expect(told.orders).toEqual([])
        game.dispose()
    })
})

describe("the random duels, played with no network", () => {
    test("two members fight a duel on one engine, shared by the manager's local game, to a winner", async() => {
        const { made, clock, announced, reports } = options()
        const shown: { battle: Battle, units: readonly string[], ready: () => void }[] = []
        const hidden: number[] = []
        const bench = {
            report: (text: string) => reports.push(text),
            showBattle: (battle: Battle, units: readonly string[], ready: () => void) => {
                shown.push({ battle, units, ready })
            },
            hideBattle: () => void hidden.push(1),
        }
        const game = new LocalGame(randomDuelMode(bench), {}, made)
        void game.join("a", "Ana")
        void game.join("b", "Bob")
        game.start()
        await settle()
        let planned = ""
        for(let turn = 0; turn < 600 && !announced.some(line => line.startsWith("Vainqueur") || line === "Égalité"); turn++){
            const last = shown.at(-1)
            if(last && last.units.length > 0 && last.battle.phase === "preparation"){
                const key = `${shown.length}:${last.battle.round}`
                if(planned !== key){
                    planned = key
                    const mine = new Set(last.units)
                    for(const unit of last.battle.awaited.units){
                        if(mine.has(unit.name)) last.battle.commitPlan(unit, last.battle.planAsBot(unit))
                    }
                    last.ready()
                }
            }
            // The member that does not own the duel plays its units on the same engine, as the owner's screen.
            for(const each of shown) {
                if(each === last || each.units.length === 0 || each.battle.phase !== "preparation") continue
                const key = `other:${each.battle.round}:${each.units.join()}`
                if(planned === key) continue
                planned = key
                const mine = new Set(each.units)
                for(const unit of each.battle.awaited.units){
                    if(mine.has(unit.name)) each.battle.commitPlan(unit, each.battle.planAsBot(unit))
                }
                each.ready()
            }
            await settle()
            if(turn % 10 === 9) clock.advance(1000)
        }
        expect(reports).toEqual([])
        expect(announced.some(line => line.includes("affronte"))).toBe(true)
        expect(announced.some(line => line.startsWith("Vainqueur") || line === "Égalité")).toBe(true)
        game.dispose()
    })
})
