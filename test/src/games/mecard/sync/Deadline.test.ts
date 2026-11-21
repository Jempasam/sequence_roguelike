import { ManualScheduler } from "@game/core"
import type { Fault } from "@game/core"
import { Deadline, DeadlineReceiver, LocalSync, UnreadableFault } from "@game/core/mecard/sync"
import { DEADLINE_TOPIC } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** A deadline on a channel, with what is heard from it. */
function deadline() {
    const timer = new ManualScheduler()
    const channel = new LocalSync()
    const host = new Deadline(timer, channel)
    const started: number[] = []
    let expired = 0
    host.started.add(ms => started.push(ms))
    host.expired.add(() => expired++)
    return { timer, channel, host, started, expired: () => expired }
}

describe("Deadline", () => {
    test("not started → not running, nothing remains", () => {
        const { host } = deadline()
        expect(host.isRunning).toBe(false)
        expect(host.remaining()).toBeNull()
    })

    test("start → running, with what remains going down, and told with its length", () => {
        const { host, timer, started } = deadline()
        host.start(1_000)
        expect(host.isRunning).toBe(true)
        expect(host.remaining()).toBe(1_000)
        timer.advance(400)
        expect(host.remaining()).toBe(600)
        expect(started).toEqual([1_000])
    })

    test("time over → expired told once, and not running", () => {
        const { host, timer, expired } = deadline()
        host.start(1_000)
        timer.advance(999)
        expect(expired()).toBe(0)
        timer.advance(1)
        expect(expired()).toBe(1)
        expect(host.isRunning).toBe(false)
        expect(host.remaining()).toBeNull()
        timer.advance(5_000)
        expect(expired()).toBe(1)
    })

    test("started again → replaces what ran: only the new one comes", () => {
        const { host, timer, expired } = deadline()
        host.start(1_000)
        timer.advance(500)
        host.start(1_000)
        timer.advance(600)
        expect(expired()).toBe(0)
        timer.advance(400)
        expect(expired()).toBe(1)
    })

    test("cancel → it never comes, and cancelling when nothing runs changes nothing", () => {
        const { host, timer, expired, channel } = deadline()
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        // A viewer connecting is told how long is left, none here.
        heard.length = 0
        host.cancel()
        expect(heard).toEqual([])
        host.start(1_000)
        heard.length = 0
        host.cancel()
        timer.advance(5_000)
        expect(expired()).toBe(0)
        expect(host.isRunning).toBe(false)
        expect(heard).toEqual([`${DEADLINE_TOPIC.name}:{"remainingMs":null}`])
    })

    test("dispose → the pending time never comes", () => {
        const { host, timer, expired } = deadline()
        host.start(1_000)
        host.dispose()
        timer.advance(5_000)
        expect(expired()).toBe(0)
    })
})

describe("DeadlineReceiver", () => {
    /** A host and a client over one channel. */
    function pair() {
        const setup = deadline()
        const clientTimer = new ManualScheduler()
        const client = new DeadlineReceiver(clientTimer, setup.channel)
        const started: number[] = []
        const faults: Fault[] = []
        let expired = 0
        client.started.add(ms => started.push(ms))
        client.expired.add(() => expired++)
        client.faulted.add(fault => faults.push(fault))
        return { ...setup, client, clientTimer, clientStarted: started, faults, clientExpired: () => expired }
    }

    test("the host starts → the client is told how long is left, and counts it itself", () => {
        const { host, client, clientTimer, clientStarted } = pair()
        host.start(1_000)
        expect(clientStarted).toEqual([1_000])
        clientTimer.advance(300)
        expect(client.remaining()).toBe(700)
    })

    test("the client never ends it alone: its own count reaching 0 is not an expiry", () => {
        const { host, client, clientTimer, clientExpired } = pair()
        host.start(1_000)
        clientTimer.advance(5_000)
        expect(client.remaining()).toBe(0)
        expect(clientExpired()).toBe(0)
    })

    test("the host says it is over → the client is told, and nothing remains", () => {
        const { host, timer, client, clientExpired } = pair()
        host.start(1_000)
        timer.advance(1_000)
        expect(clientExpired()).toBe(1)
        expect(client.remaining()).toBeNull()
    })

    test("the host cancels → nothing remains on the client, and it is not told it started", () => {
        const { host, client, clientStarted } = pair()
        host.start(1_000)
        host.cancel()
        expect(client.remaining()).toBeNull()
        expect(clientStarted).toEqual([1_000])
    })

    test("a client connecting late → told how long is left as it stands", () => {
        const { host, timer, channel } = pair()
        host.start(1_000)
        timer.advance(400)
        const late = new DeadlineReceiver(new ManualScheduler(), channel)
        expect(late.remaining()).toBe(600)
    })

    test("a client connecting when nothing runs → nothing remains", () => {
        const { channel } = pair()
        const late = new DeadlineReceiver(new ManualScheduler(), channel)
        expect(late.remaining()).toBeNull()
    })

    test("unreadable message → faulted, and left out", () => {
        const { channel, client, faults } = pair()
        channel.send(`${DEADLINE_TOPIC.name}:not json`)
        channel.send(`${DEADLINE_TOPIC.name}:{"remainingMs":"soon"}`)
        expect(faults).toHaveLength(2)
        expect(faults[0]).toBeInstanceOf(UnreadableFault)
        expect(client.remaining()).toBeNull()
    })

    test("dispose → hears nothing any more", () => {
        const { host, client, clientStarted } = pair()
        client.dispose()
        host.start(1_000)
        expect(clientStarted).toEqual([])
    })
})
