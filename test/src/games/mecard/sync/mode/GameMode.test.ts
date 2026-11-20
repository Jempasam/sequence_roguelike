import type { GameMember, GameModeContext, RunHandle } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { game, settle } from "./toys"

describe("a game of a mode", () => {
    test("the manager's run followed → shown to the client that shares it as the very same run", async() => {
        let handle: RunHandle|null = null
        const toys = game(ctx => {
            handle = ctx.openManagedRun(11)
            ctx.joined.add(who => handle?.spectate(who))
        })
        await toys.start()
        await settle()
        const local = toys.modes[1]
        expect(local.shown).toHaveLength(1)
        expect(local.shown[0].run).toBe((handle as RunHandle|null)?.run())
        toys.dispose()
    })

    test("the manager's run followed by a client far away → a replica that holds the run as it stands", async() => {
        let handle: RunHandle|null = null
        const toys = game(ctx => {
            handle = ctx.openManagedRun(11)
            ctx.joined.add(who => handle?.spectate(who))
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        expect(far.mode.shown).toHaveLength(1)
        const replica = far.mode.shown[0].run
        expect(JSON.stringify(replica.save())).toBe(JSON.stringify((handle as RunHandle|null)?.run()?.save()))
        toys.dispose()
    })

    test("states published before a client comes → told to it as they stand, and not again while they do not change", async() => {
        const toys = game(ctx => {
            ctx.publish("lives", 3)
            let left = 90
            ctx.publishLazy("deadline", () => left)
            ctx.publish("gone", 1)
            ctx.unpublish("gone")
            ctx.after(0, () => { left = 60 })
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        expect(far.mode.states).toEqual([["lives", 3], ["deadline", 90]])
        toys.dispose()
    })

    test("an order and a word to the manager → each heard by the other side, with who said it", async() => {
        // The mode learns who it is for when something is shown to it.
        const toys = game(ctx => {
            const handle = ctx.openManagedRun(1)
            ctx.joined.add(who => handle.spectate(who))
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        const ctx = toys.manager().ctx as GameModeContext
        const member = ctx.members().find(each => each.id === "far") as GameMember
        ctx.order(member, "kick")
        far.mode.me?.tellManager({ at: 3 })
        expect(far.mode.orders).toEqual(["kick"])
        expect(toys.manager().told).toEqual([["far", { at: 3 }]])
        toys.dispose()
    })

    test("a controller's intent → resolved by the owner with what the manager gave, a refusal given back as it stands", async() => {
        let handle: RunHandle|null = null
        const toys = game(ctx => {
            handle = ctx.openManagedRun(11)
            ctx.joined.add(who => { if(who.id === "far") handle?.control(who, { units: ["a"] }) })
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        expect(far.mode.shown.at(-1)?.info).toEqual({ units: ["a"] })
        const replica = far.mode.shown[0].run
        far.mode.me?.intent(replica, "go")
        far.mode.me?.intent(replica, "refused")
        expect(toys.manager().intents).toEqual([["far", { units: ["a"] }, "go"], ["far", { units: ["a"] }, "refused"]])
        toys.dispose()
    })

    test("a closed instance → hidden for those that followed it, and no longer valid", async() => {
        let handle: RunHandle|null = null
        let invalidated = 0
        const toys = game(ctx => {
            handle = ctx.openManagedRun(11)
            handle.invalidated.add(() => invalidated++)
            ctx.joined.add(who => handle?.spectate(who))
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        const open = handle as RunHandle|null
        open?.close()
        expect(far.mode.hidden).toEqual([far.mode.shown[0].run])
        expect(toys.modes[1].hidden).toHaveLength(1)
        expect(open?.valid()).toBe(false)
        expect(invalidated).toBe(1)
        toys.dispose()
    })

    test("a run owned by a client and watched by another → the owner makes it, the manager relays it", async() => {
        let handle: RunHandle|null = null
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === "owner") handle = ctx.openRun(who, 5)
                else if(who.id === "watcher") handle?.spectate(who)
            })
        })
        const links = await toys.start("owner", "watcher")
        const owner = toys.play("owner", links)
        await settle()
        const watcher = toys.play("watcher", links)
        await settle()
        const own = owner.mode.shown[0].run
        const watched = watcher.mode.shown[0].run
        expect(JSON.stringify(watched.save())).toBe(JSON.stringify(own.save()))
        // The manager holds a replica of its own once it watches.
        const open = handle as RunHandle|null
        open?.watch()
        expect(JSON.stringify(open?.run()?.save())).toBe(JSON.stringify(own.save()))
        toys.dispose()
    })

    test("the owner of an instance gone for good → invalid, and hidden for those that follow it", async() => {
        let handle: RunHandle|null = null
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === "owner") handle = ctx.openRun(who, 5)
                else if(who.id === "watcher") handle?.spectate(who)
            })
        })
        const links = await toys.start("owner", "watcher")
        toys.play("owner", links)
        await settle()
        const watcher = toys.play("watcher", links)
        await settle()
        toys.room.leave("owner")
        expect((handle as RunHandle|null)?.valid()).toBe(false)
        expect(watcher.mode.hidden).toHaveLength(1)
        toys.dispose()
    })

    test("a connection lost and back → what the client follows is shown to it again, the states are not", async() => {
        const toys = game(ctx => {
            const handle = ctx.openManagedRun(11)
            ctx.publish("lives", 3)
            ctx.joined.add(who => handle.spectate(who))
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        toys.room.drop("far")
        toys.room.back("far")
        await settle()
        expect(far.mode.shown.length).toBeGreaterThanOrEqual(2)
        expect(far.mode.states).toEqual([["lives", 3]])
        toys.dispose()
    })
})
