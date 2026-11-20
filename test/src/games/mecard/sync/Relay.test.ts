import { Fault } from "@game/core"
import {
    forward, LAST_STATE, LocalRoom, LocalSync, NOTHING, Relay, RelayedSource, signal, SyncTopic,
    UnreadableFault,
} from "@game/core/mecard/sync"
import type { Observable } from "@game/core/mecard"
import type { RelayMemory, SyncLink } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

const TOPIC = new SyncTopic("progress")

interface Relaying {
    readonly room: LocalRoom
    readonly channel: LocalSync
    readonly relay: Relay
    readonly heard: { readonly from: string, readonly message: string }[]

    /** A client joined, speaking on the topic. */
    join(id: string): SyncLink
}

function relaying(memory: RelayMemory): Relaying {
    const room = new LocalRoom()
    const channel = new LocalSync()
    const relay = new Relay(TOPIC, room, channel, memory)
    const heard: { readonly from: string, readonly message: string }[] = []
    new RelayedSource(TOPIC, channel, (from, message) => heard.push({ from, message }))
    return { room, channel, relay, heard, join: id => TOPIC.link(room.join(id)) }
}

// --- Tests ---

describe("Relay", () => {
    test("a peer speaking → everyone hears it with the id of the peer", () => {
        const { join, heard } = relaying(NOTHING)
        join("a")
        const b = join("b")
        b.send("hello")
        expect(heard).toEqual([{ from: "b", message: "hello" }])
    })

    test("the host speaking → heard as the host", () => {
        const { relay, heard } = relaying(NOTHING)
        relay.send("from the host")
        expect(heard).toEqual([{ from: "host", message: "from the host" }])
    })

    test("a message with line breaks → intact", () => {
        const { join, heard } = relaying(NOTHING)
        join("a").send("one\ntwo\n\nthree")
        expect(heard[0].message).toBe("one\ntwo\n\nthree")
    })

    test("LAST_STATE → a newcomer is given the last state of each peer, and of the host", () => {
        const { join, relay, channel } = relaying(LAST_STATE)
        join("a").send("a1")
        join("b").send("b1")
        relay.send("host1")
        const late: { readonly from: string, readonly message: string }[] = []
        new RelayedSource(TOPIC, channel, (from, message) => late.push({ from, message }))
        expect(late.map(each => `${each.from}:${each.message}`).sort()).toEqual(["a:a1", "b:b1", "host:host1"])
    })

    test("LAST_STATE → only the last thing a peer said", () => {
        const { join, channel } = relaying(LAST_STATE)
        const a = join("a")
        a.send("first")
        a.send("second")
        const late: string[] = []
        new RelayedSource(TOPIC, channel, (_from, message) => late.push(message))
        expect(late).toEqual(["second"])
    })

    test("NOTHING → a newcomer is given nothing", () => {
        const { join, channel } = relaying(NOTHING)
        join("a").send("a1")
        const late: string[] = []
        new RelayedSource(TOPIC, channel, (_from, message) => late.push(message))
        expect(late).toEqual([])
    })

    test("a peer that left → forgotten, no longer listened to", () => {
        const { join, room, channel, heard } = relaying(LAST_STATE)
        const a = join("a")
        a.send("a1")
        room.leave("a")
        a.send("a2")
        const late: string[] = []
        new RelayedSource(TOPIC, channel, (_from, message) => late.push(message))
        expect(late).toEqual([])
        expect(heard.map(each => each.message)).toEqual(["a1"])
    })

    test("a peer whose connection is only lost → what it said is kept", () => {
        const { join, room, channel } = relaying(LAST_STATE)
        join("a").send("a1")
        room.drop("a")
        const late: string[] = []
        new RelayedSource(TOPIC, channel, (_from, message) => late.push(message))
        expect(late).toEqual(["a1"])
    })

    test("each relayed message → told by relayed too", () => {
        const { join, relay } = relaying(NOTHING)
        const told: string[] = []
        relay.relayed.add(({ from, message }) => told.push(`${from}:${message}`))
        join("a").send("x")
        expect(told).toEqual(["a:x"])
    })

    test("sent as a player the host stands for → heard and relayed as that player", () => {
        const { relay, heard } = relaying(NOTHING)
        const told: string[] = []
        relay.relayed.add(({ from, message }) => told.push(`${from}:${message}`))
        relay.sendAs("local", "hello")
        expect(heard).toEqual([{ from: "local", message: "hello" }])
        expect(told).toEqual(["local:hello"])
    })

    test("LAST_STATE → a newcomer is given the last state of a player the host stands for", () => {
        const { relay, channel } = relaying(LAST_STATE)
        relay.sendAs("local", "first")
        relay.sendAs("local", "second")
        const late: string[] = []
        new RelayedSource(TOPIC, channel, (from, message) => late.push(`${from}:${message}`))
        expect(late).toEqual(["local:second"])
    })

    test("the host speaking as itself → still the host", () => {
        const { relay, heard } = relaying(NOTHING)
        relay.sendAs("host", "x")
        expect(heard).toEqual([{ from: "host", message: "x" }])
    })
})

describe("RelayedSource", () => {
    test("a message with no sender → an UnreadableFault, nothing heard", () => {
        const channel = new LocalSync()
        const source = new RelayedSource(TOPIC, channel)
        const faults: Fault[] = []
        const heard: string[] = []
        source.faulted.add(fault => faults.push(fault))
        source.heard.add(({ message }) => heard.push(message))
        TOPIC.sender(channel).send("no line break")
        expect(faults).toHaveLength(1)
        expect(faults[0]).toBeInstanceOf(UnreadableFault)
        expect(heard).toEqual([])
    })
})

/** What forwards: a brick with both observables. */
interface Brick {
    readonly faulted: Observable<Fault>
    readonly ended: Observable<Fault>
}

describe("forward", () => {
    function brick(): Brick {
        return { faulted: signal<Fault>(), ended: signal<Fault>() }
    }

    class Sample extends Fault {


        public readonly who = null

        public describe(): string {
            return "sample"
        }
    }

    test("the faulted of a child → the faulted of the parent", () => {
        const child = brick()
        const parent = brick()
        const faults: Fault[] = []
        parent.faulted.add(fault => faults.push(fault))
        forward(child, parent, true)
        const fault = new Sample()
        child.faulted.notify(fault)
        expect(faults).toEqual([fault])
    })

    test("the ended of an indispensable child → the ended of the parent", () => {
        const child = brick()
        const parent = brick()
        const ended: Fault[] = []
        const faults: Fault[] = []
        parent.ended.add(fault => ended.push(fault))
        parent.faulted.add(fault => faults.push(fault))
        forward(child, parent, true)
        child.ended.notify(new Sample())
        expect(ended).toHaveLength(1)
        expect(faults).toEqual([])
    })

    test("the ended of an optional child → a simple faulted of the parent, which goes on", () => {
        const child = brick()
        const parent = brick()
        const ended: Fault[] = []
        const faults: Fault[] = []
        parent.ended.add(fault => ended.push(fault))
        parent.faulted.add(fault => faults.push(fault))
        forward(child, parent, false)
        child.ended.notify(new Sample())
        expect(ended).toEqual([])
        expect(faults).toHaveLength(1)
    })

    test("disposed → nothing more is forwarded", () => {
        const child = brick()
        const parent = brick()
        const faults: Fault[] = []
        parent.faulted.add(fault => faults.push(fault))
        forward(child, parent, true).dispose()
        child.faulted.notify(new Sample())
        expect(faults).toEqual([])
    })
})
