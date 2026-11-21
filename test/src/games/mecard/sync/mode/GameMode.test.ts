import type { Run } from "@game/core/mecard"
import { NoAnswerFault } from "@game/core/mecard/sync"
import type { GameMember, GameModeContext, RunHandle } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { game, settle } from "./toys"

/** The id of the client that shares the manager: the first to own what the manager opens. */
const LOCAL = "host"

describe("a game of a mode", () => {
    test("a run owned by the client that shares the manager → made and shown there, the manager holds none", async() => {
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === LOCAL) ctx.openRun(who, 11)
            })
        })
        await toys.start()
        await settle()
        expect(toys.modes[1].shown).toHaveLength(1)
        expect(toys.manager().shown).toHaveLength(0)
        toys.dispose()
    })

    test("a run owned by the manager's client and followed by a client far away → a replica that holds it as it stands", async() => {
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === LOCAL) ctx.openRun(who, 11).spectateAll()
            })
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        expect(far.mode.shown).toHaveLength(1)
        const own = toys.modes[1].shown[0].run
        expect(JSON.stringify(far.mode.shown[0].run.save())).toBe(JSON.stringify(own.save()))
        toys.dispose()
    })

    test("states published before a client comes → told to it as they stand, and not again while they do not change", async() => {
        const toys = game((ctx, store) => {
            store.publish("lives", 3)
            let left = 90
            store.publishLazy("deadline", () => left)
            store.publish("gone", 1)
            store.unpublish("gone")
            ctx.after(0, () => { left = 60 })
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        expect(far.mode.states).toEqual([["lives", 3], ["deadline", 90]])
        toys.dispose()
    })

    test("an order and a word to the manager → each heard by the other side, with who said it", async() => {
        const toys = game(() => {})
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        const ctx = toys.manager().ctx as GameModeContext
        const member = ctx.members().find(each => each.id === "far") as GameMember
        ctx.channel(member).notify("kick")
        far.mode.toManager?.notify({ at: 3 })
        await settle()
        expect(far.mode.orders).toEqual(["kick"])
        expect(toys.manager().told).toEqual([["far", { at: 3 }]])
        toys.dispose()
    })

    test("a controller's intent → resolved by the owner with what the manager gave, a refusal given back as it stands", async() => {
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id !== LOCAL) return
                const handle = ctx.openRun(who, 11)
                ctx.joined.add(each => { if(each.id === "far") handle.control(each, { units: ["a"] }) })
                for(const each of ctx.members()) if(each.id === "far") handle.control(each, { units: ["a"] })
            })
        })
        const links = await toys.start("far")
        const far = toys.play("far", links)
        await settle()
        expect(far.mode.shown.at(-1)?.info).toEqual({ units: ["a"] })
        const replica = far.mode.shown[0].run
        far.mode.intent(replica, "go")
        far.mode.intent(replica, "refused")
        await settle()
        // The owner is the client that shares the manager.
        expect(toys.modes[1].intents).toEqual([["far", { units: ["a"] }, "go"], ["far", { units: ["a"] }, "refused"]])
        toys.dispose()
    })

    test("a controller says something → resolved by the owner, a client that only follows cannot say it", async() => {
        let handle: RunHandle|null = null
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === LOCAL){
                    handle = ctx.openRun(who, 11)
                    handle.spectateAll()
                }
                if(who.id === "far") handle?.control(who, { units: ["a"] })
            })
        })
        const links = await toys.start("far", "other")
        const far = toys.play("far", links)
        const other = toys.play("other", links)
        await settle()
        far.mode.intent(far.mode.shown.at(-1)?.run as Run, "go")
        other.mode.intent(other.mode.shown[0].run, "go")
        await settle()
        expect(toys.modes[1].intents).toEqual([["far", { units: ["a"] }, "go"]])
        toys.dispose()
    })

    test("the manager asks something of the owner of a run → answered with what the owner says", async() => {
        let handle: RunHandle|null = null
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === "owner") handle = ctx.openRun(who, 5)
            })
        })
        const links = await toys.start("owner")
        const owner = toys.play("owner", links)
        await settle()
        const answer = await (handle as RunHandle|null)?.ask("refused")
        expect(answer).toBe(false)
        expect(owner.mode.intents).toEqual([["", null, "refused"]])
        toys.dispose()
    })

    test("a member that is not there → told nothing, and asked in vain with the cause of it", async() => {
        const toys = game(() => {})
        const links = await toys.start("far")
        toys.play("far", links)
        await settle()
        const ctx = toys.manager().ctx as GameModeContext
        const member = ctx.members().find(each => each.id === "far") as GameMember
        toys.room.leave("far")
        await settle()
        expect(ctx.channel(member).notify("late")).toBe(false)
        const answer = await ctx.channel(member).ask("late")
        expect(answer).toBeInstanceOf(NoAnswerFault)
        expect((answer as NoAnswerFault).cause).toBe("quit")
        toys.dispose()
    })

    test("what the owner says → heard by the manager, whoever owns: the client that shares it, or one far away", async() => {
        const said: unknown[] = []
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === "owner") ctx.openRun(who, 5).said.add(message => said.push(message))
            })
        })
        const links = await toys.start("owner")
        const owner = toys.play("owner", links)
        await settle()
        owner.mode.toInstance?.notify({ seating: 1 })
        await settle()
        expect(said).toEqual([{ seating: 1 }])
        toys.dispose()
    })

    test("what the manager says to the owner, and asks of it → heard by the owner with no one to say who", async() => {
        let handle: RunHandle|null = null
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === "owner") handle = ctx.openRun(who, 5)
            })
        })
        const links = await toys.start("owner")
        const owner = toys.play("owner", links)
        await settle()
        const open = handle as RunHandle|null
        open?.notify("start")
        const answer = await open?.ask("go")
        expect(owner.mode.intents).toEqual([["", null, "start"], ["", null, "go"]])
        expect(answer).toBe(true)
        toys.dispose()
    })

    test("units given to play → shown to the client with them, with the info it was given beside", async() => {
        let handle: RunHandle|null = null
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === "owner") handle = ctx.openRun(who, 5)
                else if(who.id === "player") handle?.play(who, ["a", "b"], { fight: 1 })
            })
        })
        const links = await toys.start("owner", "player")
        toys.play("owner", links)
        await settle()
        const player = toys.play("player", links)
        await settle()
        expect(player.mode.shown.at(-1)?.info).toEqual({ fight: 1, units: ["a", "b"] })
        expect(player.mode.units.at(-1)).toEqual(["a", "b"])
        toys.dispose()
    })

    test("an instance shown to all → shown to one that comes later, and not to its owner as a follower", async() => {
        let handle: RunHandle|null = null
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id === "owner"){
                    handle = ctx.openRun(who, 5)
                    handle.spectateAll()
                }
            })
        })
        const links = await toys.start("owner")
        const owner = toys.play("owner", links)
        await settle()
        const late = toys.play("late", links)
        await settle()
        expect(owner.mode.shown).toHaveLength(1)
        expect(late.mode.shown).toHaveLength(1)
        toys.dispose()
    })

    test("a closed instance → hidden for those that followed it, and no longer valid", async() => {
        let handle: RunHandle|null = null
        let invalidated = 0
        const toys = game(ctx => {
            ctx.joined.add(who => {
                if(who.id !== LOCAL) return
                handle = ctx.openRun(who, 11)
                handle.invalidated.add(() => invalidated++)
                handle.spectateAll()
            })
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
        const toys = game((ctx, store) => {
            store.publish("lives", 3)
            ctx.joined.add(who => {
                if(who.id === LOCAL) ctx.openRun(who, 11).spectateAll()
            })
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
