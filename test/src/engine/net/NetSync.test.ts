import { Fault } from "@game/core-src/engine/net/Fault"
import { NotHostFault, RoomNotFoundFault } from "@game/core-src/engine/net/NetFaults"
import { NetSync } from "@game/core-src/engine/net/NetSync"
import { PTPClientSocket } from "@game/core-src/engine/net/PTPClientSocket"
import { ManualScheduler } from "@game/core-src/engine/net/Scheduler"
import { SessionClient } from "@game/core-src/engine/net/SessionClient"
import type { SyncPeer } from "@game/core-src/platform/SyncPort"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { nextMessage, nodeNet, signalingOf, startNetServer } from "../../fixtures/netServer"
import type { NetServer } from "../../fixtures/netServer"

// --- Fixture builders ---

let server: NetServer
let timer: ManualScheduler
const opened: NetSync[] = []

function sync(make: () => NetSync): NetSync {
    const made = make()
    opened.push(made)
    return made
}

beforeEach(async() => {
    timer = new ManualScheduler()
    server = await startNetServer()
})

afterEach(async() => {
    for(const made of opened.splice(0)) made.close()
    await server.close()
})

// --- Tests ---

describe("NetSync", () => {
    test("viewer joining → hears its first message as it stands then, at once", async() => {
        const main = sync(() => NetSync.host(nodeNet(), signalingOf(server.url), "battle", timer))
        const code = await codeOf(main)
        let first = "first"
        main.onPeer(() => first)
        first = "second"
        const viewer = sync(() => NetSync.view(nodeNet(), signalingOf(server.url), code, timer))
        expect(await nextMessage(viewer)).toBe("second")
    })

    test("viewer joining → hears the first messages in the order asked, not those with nothing to tell", async() => {
        const main = sync(() => NetSync.host(nodeNet(), signalingOf(server.url), "battle", timer))
        const code = await codeOf(main)
        main.onPeer(() => "battle")
        main.onPeer(() => null)
        main.onPeer(() => "travel")
        main.send("a move")
        const viewer = sync(() => NetSync.view(nodeNet(), signalingOf(server.url), code, timer))
        const heard: string[] = []
        viewer.listen(message => heard.push(message))
        await viewer.ready
        while(heard.length < 2) await new Promise(resolve => setTimeout(resolve, 10))
        expect(heard).toEqual(["battle", "travel"])
    })

    test("viewer connected → hears each message sent", async() => {
        const main = sync(() => NetSync.host(nodeNet(), signalingOf(server.url), "battle", timer))
        const code = await codeOf(main)
        const viewer = sync(() => NetSync.view(nodeNet(), signalingOf(server.url), code, timer))
        await viewer.ready
        await waitForViewers(main, 1)
        const heard = nextMessage(viewer)
        main.send("round 2")
        expect(await heard).toBe("round 2")
    })

    test("unknown code → ready settles with a RoomNotFoundFault, and ended tells it", async() => {
        const viewer = sync(() => NetSync.view(nodeNet(), signalingOf(server.url), "NOPE22", timer))
        const ended: Fault[] = []
        viewer.ended.add(fault => ended.push(fault))
        expect(await viewer.ready).toBeInstanceOf(RoomNotFoundFault)
        expect(ended).toHaveLength(1)
    })

    test("viewer sending → faulted with a NotHostFault, nothing thrown: a viewer only listens", async() => {
        const viewer = sync(() => NetSync.view(nodeNet(), signalingOf(server.url), "NOPE22", timer))
        const faults: Fault[] = []
        viewer.faulted.add(fault => faults.push(fault))
        await viewer.ready
        expect(() => viewer.send("hi")).not.toThrow()
        expect(faults).toHaveLength(1)
        expect(faults[0]).toBeInstanceOf(NotHostFault)
    })

    test("viewer only watching → no way to the main client", () => {
        const viewer = sync(() => NetSync.view(nodeNet(), signalingOf(server.url), "NOPE22", timer))
        expect(viewer.link).toBe(null)
        expect(viewer.room).toBe(null)
    })

    test("guest saying something before it connects → heard by the main client once connected", async() => {
        const main = sync(() => NetSync.host(nodeNet(), signalingOf(server.url), "battle", timer))
        const code = await codeOf(main)
        main.onPeer(() => "where the game is")
        const joined = joinedOf(main)
        const guest = sync(() => NetSync.view(nodeNet(), signalingOf(server.url), code, timer, true))
        guest.link?.send("I came to play")
        const peer = await joined
        expect(await nextMessage(peer)).toBe("I came to play")
    })

    test("main client answering a guest → heard by that guest alone", async() => {
        const main = sync(() => NetSync.host(nodeNet(), signalingOf(server.url), "battle", timer))
        const code = await codeOf(main)
        main.onPeer(() => "where the game is")
        const joined = joinedOf(main)
        const guest = sync(() => NetSync.view(nodeNet(), signalingOf(server.url), code, timer, true))
        const first = nextMessage(guest)
        const peer = await joined
        expect(await first).toBe("where the game is")
        const other = sync(() => NetSync.view(nodeNet(), signalingOf(server.url), code, timer))
        const heard: string[] = []
        other.listen(message => heard.push(message))
        await other.ready
        while(heard.length < 1) await new Promise(resolve => setTimeout(resolve, 10))
        const answer = nextMessage(guest)
        peer.send("you play the Lancier")
        expect(await answer).toBe("you play the Lancier")
        expect(heard).toEqual(["where the game is"])
    })

    test("guest leaving → lost at once, then left for good once its grace is over, with the same id", async() => {
        const main = sync(() => NetSync.host(nodeNet(), signalingOf(server.url), "battle", timer))
        const code = await codeOf(main)
        const joined = joinedOf(main)
        const lost = new Promise<SyncPeer>(resolve => main.room?.onLost(resolve))
        const left: SyncPeer[] = []
        main.room?.onLeave(peer => left.push(peer))
        const guest = NetSync.view(nodeNet(), signalingOf(server.url), code, timer, true)
        await guest.ready
        const peer = await joined
        guest.close()
        expect((await lost).id).toBe(peer.id)
        expect(left).toEqual([])
        timer.advance(60_000)
        expect(left.map(each => each.id)).toEqual([peer.id])
    })

    test("guest coming back on its session → told back, and given the first messages again", async() => {
        const main = sync(() => NetSync.host(nodeNet(), signalingOf(server.url), "battle", timer))
        const code = await codeOf(main)
        main.onPeer(() => "where the game is")
        const joined = joinedOf(main)
        const lost = new Promise<SyncPeer>(resolve => main.room?.onLost(resolve))
        const back = new Promise<SyncPeer>(resolve => main.room?.onBack(resolve))
        // A client of its own, to hold the socket it drops.
        const sockets: PTPClientSocket[] = []
        const guest = new SessionClient(async data => {
            const socket = await PTPClientSocket.join(nodeNet(), signalingOf(server.url), code, { data })
            sockets.push(socket)
            return socket
        }, { timer, graceMs: 60_000, retryMs: 1_000 })
        const heard: string[] = []
        guest.link.listen(message => heard.push(message))
        const reconnected = new Promise<void>(resolve => guest.reconnected.add(resolve))
        await guest.connect()
        const peer = await joined
        while(heard.length < 1) await new Promise(resolve => setTimeout(resolve, 10))
        // Its connection drops, as a network would: the host sees it lost, the guest comes back by itself.
        sockets[0].close()
        expect((await lost).id).toBe(peer.id)
        await reconnected
        expect((await back).id).toBe(peer.id)
        while(heard.length < 2) await new Promise(resolve => setTimeout(resolve, 10))
        expect(heard).toEqual(["where the game is", "where the game is"])
    })

    test("guest lost → what is said to it meanwhile is given in order when it is back, before the first messages", async() => {
        const main = sync(() => NetSync.host(nodeNet(), signalingOf(server.url), "battle", timer))
        const code = await codeOf(main)
        main.onPeer(() => "where the game is")
        const joined = joinedOf(main)
        const lost = new Promise<SyncPeer>(resolve => main.room?.onLost(resolve))
        const back = new Promise<SyncPeer>(resolve => main.room?.onBack(resolve))
        const sockets: PTPClientSocket[] = []
        const guest = new SessionClient(async data => {
            const socket = await PTPClientSocket.join(nodeNet(), signalingOf(server.url), code, { data })
            sockets.push(socket)
            return socket
        }, { timer, graceMs: 60_000, retryMs: 1_000 })
        const heard: string[] = []
        guest.link.listen(message => heard.push(message))
        const reconnected = new Promise<void>(resolve => guest.reconnected.add(resolve))
        await guest.connect()
        const peer = await joined
        while(heard.length < 1) await new Promise(resolve => setTimeout(resolve, 10))
        sockets[0].close()
        await lost
        peer.send("first")
        main.send("second")
        peer.send("third")
        await reconnected
        await back
        while(heard.length < 5) await new Promise(resolve => setTimeout(resolve, 10))
        expect(heard).toEqual(["where the game is", "first", "second", "third", "where the game is"])
    })

    test("guest gone for good → nothing kept for it is given to a newcomer", async() => {
        const main = sync(() => NetSync.host(nodeNet(), signalingOf(server.url), "battle", timer))
        const code = await codeOf(main)
        const joined = joinedOf(main)
        const lost = new Promise<SyncPeer>(resolve => main.room?.onLost(resolve))
        const left: SyncPeer[] = []
        main.room?.onLeave(peer => left.push(peer))
        const guest = NetSync.view(nodeNet(), signalingOf(server.url), code, timer, true)
        await guest.ready
        const peer = await joined
        guest.close()
        await lost
        peer.send("missed")
        timer.advance(60_000)
        expect(left).toHaveLength(1)
        const other = sync(() => NetSync.view(nodeNet(), signalingOf(server.url), code, timer))
        const heard: string[] = []
        other.listen(message => heard.push(message))
        await other.ready
        await waitForViewers(main, 1)
        await new Promise(resolve => setTimeout(resolve, 100))
        expect(heard).toEqual([])
    })
})

/** The code of the room of a main client once it is open. */
async function codeOf(main: NetSync): Promise<string> {
    const code = await main.ready
    return code instanceof Fault ? code.describe() : code
}

/** The next client connecting to the main client. */
function joinedOf(main: NetSync): Promise<SyncPeer> {
    return new Promise(resolve => main.room?.onJoin(resolve))
}

/** Wait until the main client has this many viewers connected. */
async function waitForViewers(main: NetSync, count: number): Promise<void> {
    while(main.viewers < count) await new Promise(resolve => setTimeout(resolve, 10))
}
