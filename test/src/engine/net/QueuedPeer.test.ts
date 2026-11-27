import { MemoryConnection } from "@game/core-src/engine/net/MemoryConnection"
import { OutboxFullFault } from "@game/core-src/engine/net/NetFaults"
import { QueuedPeer } from "@game/core-src/engine/net/QueuedPeer"
import { SessionPeer } from "@game/core-src/engine/net/SessionPeer"
import type { Fault } from "@game/core-src/engine/net/Fault"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    for(let turn = 0; turn < 10; turn++) await Promise.resolve()
}

/** A peer whose connection goes to a far end that records what reaches it. */
async function setup(limit?: number) {
    const [near, far] = MemoryConnection.pair()
    await near.opened
    const heard: string[] = []
    far.listen(message => heard.push(message))
    const peer = new SessionPeer("session", "member", near)
    const faults: Fault[] = []
    const queued = new QueuedPeer(peer, fault => faults.push(fault), limit)
    return { near, far, peer, queued, heard, faults }
}

describe("QueuedPeer", () => {
    test("id → the one of its session", async() => {
        const { queued } = await setup()
        expect(queued.id).toBe("session")
    })

    test("connection fine → messages go through at once", async() => {
        const { queued, heard } = await setup()
        queued.send("a")
        queued.send("b")
        await settle()
        expect(heard).toEqual(["a", "b"])
    })

    test("connection lost → nothing reaches the far end", async() => {
        const { queued, peer, heard } = await setup()
        peer.markLost()
        queued.send("a")
        await settle()
        expect(heard).toEqual([])
    })

    test("connection back and flush → what was kept arrives in order, then new messages go through", async() => {
        const { queued, peer, heard } = await setup()
        peer.markLost()
        queued.send("a")
        queued.send("b")
        const [near, far] = MemoryConnection.pair()
        await near.opened
        const heardAgain: string[] = []
        far.listen(message => heardAgain.push(message))
        peer.markBack("member2", near)
        queued.flush()
        queued.send("c")
        await settle()
        expect(heardAgain).toEqual(["a", "b", "c"])
        expect(heard).toEqual([])
    })

    test("flush twice → what was kept is given once", async() => {
        const { queued, peer } = await setup()
        peer.markLost()
        queued.send("a")
        const [near, far] = MemoryConnection.pair()
        await near.opened
        const heard: string[] = []
        far.listen(message => heard.push(message))
        peer.markBack("member2", near)
        queued.flush()
        queued.flush()
        await settle()
        expect(heard).toEqual(["a"])
    })

    test("forget → what was kept is not given by a later flush", async() => {
        const { queued, peer } = await setup()
        peer.markLost()
        queued.send("a")
        queued.forget()
        const [near, far] = MemoryConnection.pair()
        await near.opened
        const heard: string[] = []
        far.listen(message => heard.push(message))
        peer.markBack("member2", near)
        queued.flush()
        await settle()
        expect(heard).toEqual([])
    })

    test("more kept than the limit → the oldest are lost, and the fault is told once for the flood", async() => {
        const { queued, peer, faults } = await setup(2)
        peer.markLost()
        for(const message of ["a", "b", "c", "d", "e"]) queued.send(message)
        expect(faults).toHaveLength(1)
        expect(faults[0]).toBeInstanceOf(OutboxFullFault)
        expect(faults[0].who).toBe("session")
        const [near, far] = MemoryConnection.pair()
        await near.opened
        const heard: string[] = []
        far.listen(message => heard.push(message))
        peer.markBack("member2", near)
        queued.flush()
        await settle()
        expect(heard).toEqual(["d", "e"])
    })

    test("flood told, flushed, then a new flood → told again", async() => {
        const { queued, peer, faults } = await setup(1)
        peer.markLost()
        queued.send("a")
        queued.send("b")
        queued.flush()
        queued.send("c")
        queued.send("d")
        expect(faults).toHaveLength(2)
    })

    test("listen → hears what the client says, even after it came back on another connection", async() => {
        const { queued, peer, far } = await setup()
        const heard: string[] = []
        queued.listen(message => heard.push(message))
        far.send("one")
        await settle()
        peer.markLost()
        const [near, other] = MemoryConnection.pair()
        await near.opened
        peer.markBack("member2", near)
        other.send("two")
        await settle()
        expect(heard).toEqual(["one", "two"])
    })
})
