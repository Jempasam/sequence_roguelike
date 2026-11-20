import { EventRoom, INTENT_TOPIC, StatePublisher, StateSource, TELL_TOPIC } from "@game/core/mecard/sync"
import type { GameModeContext, RunHandle } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { game, settle } from "./toys"

/** A manager that opens a run for everyone that joins, and keeps its handle. */
function following(spec: unknown = 11) {
    const box: { handle: RunHandle|null } = { handle: null }
    const toys = game(ctx => {
        box.handle = ctx.openManagedRun(spec)
        ctx.joined.add(who => box.handle?.spectate(who))
    })
    return { toys, box }
}

describe("the runner, at its edges", () => {
    test("a mode that cannot make a run from its spec → reported, the handle is not valid, nothing breaks", async() => {
        const { toys, box } = following("boom")
        await toys.start("far")
        toys.play("far", new Map())
        await settle()
        expect(box.handle?.valid()).toBe(false)
        expect(box.handle?.run()).toBeNull()
        expect(toys.reports.length).toBeGreaterThan(0)
        // Asking of an instance that is not valid does nothing.
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
        TELL_TOPIC.link(link).send("this is {not json")
        INTENT_TOPIC.link(link).send("{\"id\": 999, \"intent\": 1}")
        INTENT_TOPIC.link(link).send("[1, 2]")
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
        far.mode.me?.intent(far.mode.shown[0].run, "go")
        expect(toys.manager().intents).toEqual([])
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
        expect(() => (toys.manager().ctx as GameModeContext).publish("late", 1)).not.toThrow()
        const ctx = toys.manager().ctx as GameModeContext
        expect(() => ctx.order(ctx.members()[0], 1)).not.toThrow()
    })

    test("two instances at once → each told apart, closing one leaves the other", async() => {
        const box: { first: RunHandle|null, second: RunHandle|null } = { first: null, second: null }
        const toys = game(ctx => {
            box.first = ctx.openManagedRun(1)
            box.second = ctx.openManagedRun(2)
            ctx.joined.add(who => {
                box.first?.spectate(who)
                box.second?.spectate(who)
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

    test("a state published, taken back, then published again → told each time it changes", async() => {
        const toys = game(ctx => {
            ctx.publish("k", 1)
            ctx.unpublish("k")
            ctx.publish("k", 1)
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
        publisher.onPeer(() => null).dispose()
        expect(published.size).toBe(0)
    })

    test("a brick that stops → its state is taken back, unless another took the key since", () => {
        const { ctx, published } = context()
        const publisher = new StatePublisher(ctx)
        const first = publisher.onPeer(() => "lives:a")
        const second = publisher.onPeer(() => "lives:b")
        first.dispose()
        expect(published.get("lives")?.()).toBe("lives:b")
        second.dispose()
        expect(published.has("lives")).toBe(false)
    })

    test("a source → hears the states that are texts only, and no more once its listener is gone", () => {
        const source = new StateSource()
        const heard: string[] = []
        const handle = source.listen(text => heard.push(text))
        source.receive("lives:x")
        source.receive(12)
        source.receive(null)
        handle.dispose()
        source.receive("lives:y")
        expect(heard).toEqual(["lives:x"])
    })
})

describe("EventRoom", () => {
    test("told by hand → each kind of event reaches its listeners with the id, and a listener removed hears no more", () => {
        const room = new EventRoom()
        const events: string[] = []
        room.onLost(peer => events.push(`lost ${peer.id}`))
        room.onBack(peer => events.push(`back ${peer.id}`))
        const handle = room.onLeave(peer => events.push(`left ${peer.id}`))
        room.lose("a")
        room.return("a")
        room.leave("a")
        handle.dispose()
        room.leave("b")
        expect(events).toEqual(["lost a", "back a", "left a"])
    })

    test("someone connecting → never told: the mode knows its players", () => {
        const room = new EventRoom()
        const events: string[] = []
        // A room of a game is told of losses and leavings alone: a handler for joining is never called.
        ;(room.onJoin as (handler: () => void) => unknown)(() => events.push("join"))
        room.lose("a")
        expect(events).toEqual([])
    })
})
