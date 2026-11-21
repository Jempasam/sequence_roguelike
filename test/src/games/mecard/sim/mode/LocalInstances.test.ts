import { ManualScheduler } from "@game/core"
import type { Run } from "@game/core/mecard"
import { Rng } from "@game/core/mecard"
import { LocalGame, reacting } from "@game/core/mecard/sync"
import type {
    GameMember, GameMode, GameModeContext, GameModeManager, GameModeOwner, GameModeShareable, HandleChannel,
    InstanceView, RunHandle,
} from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { startedRun } from "../../../../fixtures/startedRun"
import type { Removable } from "@game/core"

async function settle(): Promise<void> {
    for(let turn = 0; turn < 40; turn++) await Promise.resolve()
}

/** What a client holds of the runs: the one it made, what it was shown and what it was told on it. */
class Owner implements GameModeOwner {


    public readonly made: Run[] = []
    public readonly shown: { run: Run, me: string, own: boolean, info: unknown, units: readonly string[] }[] = []
    public readonly says: Map<string, ((message: GameModeShareable) => void)|undefined> = new Map()
    public readonly disposed: string[] = []
    public readonly heard: [string, unknown, unknown][] = []

    /** What the owner of a run says to the manager by. */
    public toManager: HandleChannel|null = null

    public createRun(spec: GameModeShareable, toManager: HandleChannel) {
        this.toManager = toManager
        const run = startedRun(Number(spec))
        this.made.push(run)
        return [run, reacting({
            act: ({ from, info, message }) => void this.heard.push([from?.id ?? "", info, message]),
            ask: ({ message }) => message === "refused" ? "no" : "yes",
        })] as const as never
    }

    public spectateRun(view: InstanceView<Run>): Removable {
        this.shown.push({ run: view.engine, me: view.me, own: view.own, info: view.info, units: view.units })
        this.says.set(view.me, view.say)
        return { remove: () => void this.disposed.push(view.me) }
    }
}

/** A manager that does what the test says once it runs, and keeps its context and its handle. */
class Scripted implements GameModeManager {


    public ctx!: GameModeContext
    public handle: RunHandle|null = null
    public readonly calls: string[] = []

    constructor(private readonly script: (self: Scripted) => void){}


    public run(ctx: GameModeContext): void {
        this.ctx = ctx
        this.script(this)
    }

    public onQuit(_ctx: GameModeContext, who: GameMember): void {
        this.calls.push(`quit ${who.id}`)
    }

    public member(id: string): GameMember {
        return this.ctx.members().find(each => each.id === id) as GameMember
    }
}

async function played(script: (self: Scripted) => void) {
    const manager = new Scripted(script)
    const owner = new Owner()
    const mode: GameMode = { id: "m", title: "M", description: "", settings: [], manager: () => manager, owner: () => owner }
    const clock = new ManualScheduler()
    const reports: string[] = []
    const game = new LocalGame(mode, {}, {
        clock, rng: new Rng(1), announce: () => {}, report: text => reports.push(text),
    })
    void game.join("a", "Ana")
    void game.join("b", "Bob")
    game.start()
    await settle()
    return { game, manager, owner, reports }
}

describe("the instances of a local game", () => {
    test("a run opened for a member → made once by the client, shown to its owner as the owner", async() => {
        const { manager, owner } = await played(self => { self.handle = self.ctx.openRun(self.member("a"), 4) })
        expect(owner.made).toHaveLength(1)
        expect(owner.shown).toHaveLength(1)
        expect(owner.shown[0]).toMatchObject({ me: "a", own: true, run: owner.made[0] })
        expect(manager.handle?.valid()).toBe(true)
    })

    test("shown to all → every other member is shown the very engine, no replica, and the owner is not shown twice", async() => {
        const { owner } = await played(self => { self.ctx.openRun(self.member("a"), 4).spectateAll() })
        expect(owner.shown.map(each => [each.me, each.own])).toEqual([["a", true], ["b", false]])
        expect(owner.shown[1].run).toBe(owner.shown[0].run)
    })

    test("a member given the play → shown it again with the units and the info, and able to say something", async() => {
        const { owner, manager } = await played(self => {
            self.handle = self.ctx.openRun(self.member("a"), 4)
            self.handle.play(self.member("b"), ["u1"], { fight: 1 })
        })
        const last = owner.shown.at(-1)
        expect(last).toMatchObject({ me: "b", units: ["u1"], info: { fight: 1, units: ["u1"] } })
        owner.says.get("b")?.({ plan: 1 })
        await settle()
        expect(owner.heard).toEqual([["b", { fight: 1, units: ["u1"] }, { plan: 1 }]])
        // The owner is not given the control: it has no way to say anything of its own.
        expect(owner.says.get("a")).toBeUndefined()
        void manager
    })

    test("the manager says and asks of the owner → heard with no one to say who, and answered", async() => {
        const { owner, manager } = await played(self => { self.handle = self.ctx.openRun(self.member("a"), 4) })
        const handle = manager.handle as RunHandle
        expect(handle.notify("start")).toBeUndefined()
        expect(await handle.ask("go")).toBe("yes")
        expect(await handle.ask("refused")).toBe("no")
        expect(owner.heard).toEqual([["", null, "start"]])
    })

    test("what the owner says → heard by the manager on said, and again by one that listens late", async() => {
        const { manager, owner } = await played(self => { self.handle = self.ctx.openRun(self.member("a"), 4) })
        const early: unknown[] = []
        manager.handle?.said.add(message => early.push(message))
        owner.toManager?.notify({ seating: { b: ["u1"] } })
        await settle()
        expect(early).toEqual([{ seating: { b: ["u1"] } }])
        const late: unknown[] = []
        manager.handle?.said.add(message => late.push(message))
        expect(late).toEqual(early)
    })

    test("a member released → its view is disposed once, and one closed for all is disposed for each", async() => {
        const { owner, manager } = await played(self => {
            self.handle = self.ctx.openRun(self.member("a"), 4)
            self.handle.spectateAll()
        })
        const handle = manager.handle as RunHandle
        handle.release(manager.member("b"))
        handle.release(manager.member("b"))
        expect(owner.disposed).toEqual(["b"])
        let invalidated = 0
        handle.invalidated.add(() => invalidated++)
        handle.close()
        handle.close()
        expect(owner.disposed).toEqual(["b", "a"])
        expect(handle.valid()).toBe(false)
        expect(invalidated).toBe(1)
    })

    test("the owner quits → the instance is invalid, the manager is told once, and the others lose their view", async() => {
        const { owner, manager, game } = await played(self => {
            self.handle = self.ctx.openRun(self.member("a"), 4)
            self.handle.spectateAll()
        })
        game.manager.quit("a")
        await settle()
        expect(manager.handle?.valid()).toBe(false)
        expect(manager.calls).toEqual(["quit a"])
        expect(owner.disposed.sort()).toEqual(["a", "b"])
    })

    test("a member that plays loses its connection, comes back, then quits → the owner is told of each, as a notice", async() => {
        const { owner, game } = await played(self => {
            self.handle = self.ctx.openRun(self.member("a"), 4)
            self.handle.play(self.member("b"), ["u1"])
        })
        game.manager.lose("b")
        game.manager.back("b")
        game.manager.quit("b")
        await settle()
        expect(owner.heard.map(([, , message]) => message)).toEqual([{ lost: "b" }, { back: "b" }, { left: "b" }])
    })

    test("an instance for a member that is not there → invalid at once, nothing made", async() => {
        const { owner, manager } = await played(self => { self.handle = self.ctx.openRun({ id: "z", name: "z", connected: true, options: {} }, 4) })
        expect(manager.handle?.valid()).toBe(false)
        expect(owner.made).toEqual([])
    })
})
