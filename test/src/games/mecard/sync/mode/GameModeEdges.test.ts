import { ACT_TOPIC, NoAnswerFault, StatePublisher, StateSource } from "@game/core/mecard/sync"
import type { GameMember, GameModeContext, GameModeShareable, RunHandle } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { game, settle } from "./toys"

/** A manager that opens a run owned by the client that shares it, shown to everyone, and keeps its handle. */
function following(spec: GameModeShareable = 11) {
    const box: { handle: RunHandle|null } = { handle: null }
    const toys = game(ctx => {
        ctx.joined.add(who => {
            if(who.id !== "host") return
            box.handle = ctx.openRun(who, spec)
            box.handle.spectateAll()
        })
    })
    return { toys, box }
}

describe("the runner, at its edges", () => {
    test("a mode that cannot make a run from its spec → reported, nothing breaks", async() => {
        const { toys, box } = following("boom")
        await toys.start("far")
        toys.play("far", new Map())
        await settle()
        expect(toys.reports.length).toBeGreaterThan(0)
        // Asking of an instance whose owner could not make it does nothing.
        const member = (toys.manager().ctx as GameModeContext).members()[0]
        expect(() => box.handle?.control(member, 1)).not.toThrow()
        toys.dispose()
    })

    test("control given again with other info → shown again with it, on the same run", async() => {
        const { toys, box } = following()
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        const member = (toys.manager().ctx as GameModeContext).members().find(each => each.id === "far")
        if(!member) throw new Error("No member.")
        box.handle?.control(member, { n: 1 })
        box.handle?.control(member, { n: 2 })
        const infos = far.mode.shown.map(each => each.info)
        expect(infos.at(-2)).toEqual({ n: 1 })
        expect(infos.at(-1)).toEqual({ n: 2 })
        expect(new Set(far.mode.shown.map(each => each.run)).size).toBe(1)
        box.handle?.uncontrol(member)
        expect(far.mode.shown.at(-1)?.info).toBeNull()
        toys.dispose()
    })

    test("released then followed again → hidden, then shown again", async() => {
        const { toys, box } = following()
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        const member = (toys.manager().ctx as GameModeContext).members().find(each => each.id === "far")
        if(!member) throw new Error("No member.")
        box.handle?.release(member)
        expect(far.mode.hidden).toHaveLength(1)
        const before = far.mode.shown.length
        box.handle?.spectate(member)
        expect(far.mode.shown.length).toBe(before + 1)
        expect(box.handle?.valid()).toBe(true)
        toys.dispose()
    })

    test("a word that is not JSON, and an intent on an instance that is not there → left out, nothing breaks", async() => {
        const { toys } = following()
        const links = await toys.start("far")
        toys.play("far", links)
        await settle()
        const link = links.get("far")
        if(!link) throw new Error("No link.")
        ACT_TOPIC.link(link).send("this is {not json")
        ACT_TOPIC.link(link).send("{\"id\": 999, \"message\": 1}")
        ACT_TOPIC.link(link).send("[1, 2]")
        await settle()
        expect(toys.reports.length).toBeGreaterThanOrEqual(2)
        expect(toys.manager().told).toEqual([])
        toys.dispose()
    })

    test("an intent from someone that only follows → not resolved", async() => {
        const { toys } = following()
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        far.mode.intent(far.mode.shown[0].run, "go")
        expect(toys.modes[1].intents).toEqual([])
        toys.dispose()
    })

    test("the owner of an instance loses its connection → the instance stays valid, and is its own again once back", async() => {
        const box: { handle: RunHandle|null } = { handle: null }
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === "owner") box.handle = ctx.openRun(who, 5)
                else if(who.id === "watcher") box.handle?.spectate(who)
            })
        })
        const links = await toys.start("owner", "watcher")
        const owner = toys.play("owner", links)
        await settle()
        const watcher = toys.play("watcher", links)
        await settle()
        toys.room.drop("owner")
        expect(box.handle?.valid()).toBe(true)
        expect(watcher.mode.hidden).toHaveLength(0)
        toys.room.back("owner")
        await settle()
        expect(box.handle?.valid()).toBe(true)
        expect(owner.mode.shown.length).toBeGreaterThanOrEqual(2)
        expect(new Set(owner.mode.shown.map(each => each.run)).size).toBe(1)
        toys.dispose()
    })

    test("a client that quits and comes back while an instance is open → shown it again, as a new client", async() => {
        const { toys } = following()
        const links = await toys.start("far")
        const first = toys.play("far", links)
        await settle()
        first.run.quit?.()
        first.run.dispose()
        await settle()
        // Its screen was taken off when it left.
        expect(first.mode.hidden).toHaveLength(1)
        const second = toys.play("far", links)
        await settle()
        expect(second.mode.shown).toHaveLength(1)
        toys.dispose()
    })

    test("the game disposed → what was shown to the client that shares the manager is taken off, and nothing is told after", async() => {
        const { toys } = following()
        await toys.start()
        await settle()
        const local = toys.modes[1]
        expect(local.shown).toHaveLength(1)
        toys.dispose()
        const ctx = toys.manager().ctx as GameModeContext
        expect(() => ctx.publish("late", 1)).not.toThrow()
        expect(() => ctx.channel(ctx.members()[0]).notify(1)).not.toThrow()
    })

    test("two instances at once → each told apart, closing one leaves the other", async() => {
        const box: { first: RunHandle|null, second: RunHandle|null } = { first: null, second: null }
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id !== "host") return
                box.first = ctx.openRun(who, 1)
                box.second = ctx.openRun(who, 2)
                box.first.spectateAll()
                box.second.spectateAll()
            })
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        expect(new Set(far.mode.shown.map(each => each.run)).size).toBe(2)
        box.first?.close()
        expect(far.mode.hidden).toHaveLength(1)
        expect(box.second?.valid()).toBe(true)
        toys.dispose()
    })

    test("the people of the game → the manager is told of each join once, a quit once and after a join, a lost connection apart", async() => {
        const toys = game(() => {})
        const links = await toys.start("far", "gone")
        toys.play("far", links)
        const gone = toys.play("gone", links)
        await settle()
        toys.room.drop("far")
        toys.room.back("far")
        gone.run.quit?.()
        gone.run.quit?.()
        await settle()
        const calls = toys.manager().calls
        expect(calls.filter(call => call.startsWith("join"))).toEqual(["join host", "join far", "join gone"])
        expect(calls.filter(call => call.startsWith("quit"))).toEqual(["quit gone"])
        expect(calls.filter(call => call.endsWith(" far") && !call.startsWith("join"))).toEqual(["lost far", "back far"])
        toys.dispose()
    })

    test("a run followed → made with the mode by its owner alone, the others hold a replica the game makes", async() => {
        const { toys } = following(5)
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        expect(toys.modes[1].made).toBe(1)
        expect(far.mode.made).toBe(0)
        expect(far.mode.shown).toHaveLength(1)
        expect(far.mode.shown[0].run).not.toBe(toys.modes[1].shown[0].run)
        expect(JSON.stringify(far.mode.shown[0].run.save())).toBe(JSON.stringify(toys.modes[1].shown[0].run.save()))
        toys.dispose()
    })

    test("a member that plays loses its connection, is back, then quits → the owner is told of each, with its id", async() => {
        const { toys, box } = following()
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        const member = (toys.manager().ctx as GameModeContext).members().find(each => each.id === "far")
        if(!member) throw new Error("No member.")
        box.handle?.control(member, { n: 1 })
        await settle()
        toys.room.drop("far")
        toys.room.back("far")
        far.run.quit?.()
        await settle()
        const notices = toys.modes[1].intents.filter(([from]) => from === "").map(([, , message]) => message)
        expect(notices).toEqual([{ lost: "far" }, { back: "far" }, { left: "far" }])
        toys.dispose()
    })

    test("told while its connection is lost → nothing before it is back, then all of it, in the order it was told", async() => {
        const toys = game(() => {})
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        const ctx = toys.manager().ctx as GameModeContext
        const member = ctx.members().find(each => each.id === "far") as GameMember
        toys.room.drop("far")
        await settle()
        expect(ctx.channel(member).notify("one")).toBeUndefined()
        ctx.channel(member).notify("two")
        ctx.broadcast("three")
        await settle()
        expect(far.mode.orders).toEqual([])
        toys.room.back("far")
        await settle()
        expect(far.mode.orders).toEqual(["one", "two", "three"])
        toys.dispose()
    })

    test("asked while its connection is lost → answered once it is back, or too slow with the cause of it", async() => {
        const toys = game(() => {})
        const links = await toys.start("far")
        toys.play("far", links)
        await settle()
        const ctx = toys.manager().ctx as GameModeContext
        const member = ctx.members().find(each => each.id === "far") as GameMember
        toys.room.drop("far")
        await settle()
        const patient = ctx.channel(member).ask("ping")
        const hurried = ctx.channel(member).ask("ping", 1000)
        toys.timer.advance(1001)
        const slow = await hurried
        expect(slow).toBeInstanceOf(NoAnswerFault)
        expect((slow as NoAnswerFault).cause).toBe("timeout")
        toys.room.back("far")
        await settle()
        expect(await patient).toBe("pong")
        toys.dispose()
    })

    test("the game disposed while a mode sleeps → it does not go on, and nothing is thrown", async() => {
        const ran: string[] = []
        const toys = game(ctx => {
            void ctx.sleep(1000).then(() => ran.push("after the sleep"))
        })
        const links = await toys.start("far")
        toys.play("far", links)
        await settle()
        toys.dispose()
        toys.timer.advance(2000)
        await settle()
        expect(ran).toEqual([])
    })

    test("the game disposed while an ask waits → the ask is answered by a fault, not left waiting", async() => {
        const toys = game(() => {})
        const links = await toys.start("far")
        toys.play("far", links)
        await settle()
        const ctx = toys.manager().ctx as GameModeContext
        const member = ctx.members().find(each => each.id === "far") as GameMember
        toys.room.drop("far")
        await settle()
        const asked = ctx.channel(member).ask("ping")
        toys.dispose()
        const answer = await asked
        expect(answer).toBeInstanceOf(NoAnswerFault)
        expect((answer as NoAnswerFault).cause).toBe("quit")
    })

    test("a member that quits while its connection is lost → what it missed is dropped, its asks are not heard", async() => {
        const toys = game(() => {})
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        const ctx = toys.manager().ctx as GameModeContext
        const member = ctx.members().find(each => each.id === "far") as GameMember
        toys.room.drop("far")
        await settle()
        ctx.channel(member).notify("one")
        const asked = ctx.channel(member).ask("ping")
        toys.room.leave("far")
        const answer = await asked
        expect(answer).toBeInstanceOf(NoAnswerFault)
        expect((answer as NoAnswerFault).cause).toBe("quit")
        expect(far.mode.orders).toEqual([])
        toys.dispose()
    })

    test("the owner of a run loses its connection → what the manager says to it comes once it is back, in order", async() => {
        const box: { handle: RunHandle|null } = { handle: null }
        const toys = game(ctx => {
            ctx.joined.add(who => { if(who.id === "owner") box.handle = ctx.openRun(who, 5) })
        })
        const links = await toys.start("owner")
        const owner = toys.play("owner", links)
        await settle()
        toys.room.drop("owner")
        await settle()
        box.handle?.notify("start")
        box.handle?.notify("next")
        await settle()
        expect(owner.mode.intents).toEqual([])
        toys.room.back("owner")
        await settle()
        expect(owner.mode.intents.map(([, , message]) => message)).toEqual(["start", "next"])
        toys.dispose()
    })

    test("a member that only follows → the owner is told nothing of it", async() => {
        const { toys } = following()
        const links = await toys.start("far")
        toys.play("far", links)
        await settle()
        toys.room.drop("far")
        toys.room.back("far")
        await settle()
        expect(toys.modes[1].intents).toEqual([])
        toys.dispose()
    })

    test("a state published, taken back, then published again → told each time it changes", async() => {
        const toys = game((_ctx, store) => {
            store.publish("k", 1)
            store.unpublish("k")
            store.publish("k", 1)
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        // Only what stands is told to one that comes: the first state.
        expect(far.mode.states).toEqual([["k", 1]])
        toys.dispose()
    })
})

describe("StatePublisher and StateSource", () => {
    function context() {
        const published = new Map<string, () => unknown>()
        const ctx = {
            publish: (key: string, value: unknown) => published.set(key, () => value),
            publishLazy: (key: string, value: () => unknown) => published.set(key, value),
            unpublish: (key: string) => published.delete(key),
        } as unknown as GameModeContext
        return { ctx, published }
    }

    test("what a brick says first → a state named by its topic, read at each sending", () => {
        const { ctx, published } = context()
        const publisher = new StatePublisher(ctx)
        let left = 90
        publisher.onPeer(() => `deadline:${left}`)
        expect(published.get("deadline")?.()).toBe("deadline:90")
        left = 60
        expect(published.get("deadline")?.()).toBe("deadline:60")
    })

    test("a brick with nothing to say first → each message is a state of its own, never the same text twice", () => {
        const { ctx, published } = context()
        const publisher = new StatePublisher(ctx)
        publisher.send("deadline-expired:")
        const first = published.get("deadline-expired")?.()
        publisher.send("deadline-expired:")
        expect(published.get("deadline-expired")?.()).not.toBe(first)
    })

    test("a brick that says nothing first yet → nothing is published, and nothing breaks when it stops", () => {
        const { ctx, published } = context()
        const publisher = new StatePublisher(ctx)
        publisher.onPeer(() => null).remove()
        expect(published.size).toBe(0)
    })

    test("a brick that stops → its state is taken back, unless another took the key since", () => {
        const { ctx, published } = context()
        const publisher = new StatePublisher(ctx)
        const first = publisher.onPeer(() => "lives:a")
        const second = publisher.onPeer(() => "lives:b")
        first.remove()
        expect(published.get("lives")?.()).toBe("lives:b")
        second.remove()
        expect(published.has("lives")).toBe(false)
    })

    test("a source → hears the states that are texts only, and no more once its listener is gone", () => {
        const source = new StateSource()
        const heard: string[] = []
        const handle = source.listen(text => heard.push(text))
        source.receive("lives:x")
        source.receive(12)
        source.receive(null)
        handle.remove()
        source.receive("lives:y")
        expect(heard).toEqual(["lives:x"])
    })
})

