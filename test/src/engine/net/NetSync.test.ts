import { NetSync } from "@game/core"
import type { SyncPeer } from "@game/core"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { nextMessage, nodeNet, startNetServer } from "../../fixtures/netServer"
import type { NetServer } from "../../fixtures/netServer"

// --- Fixture builders ---

let server: NetServer
const opened: NetSync[] = []

function sync(make: () => NetSync): NetSync {
    const made = make()
    opened.push(made)
    return made
}

beforeEach(async() => {
    server = await startNetServer()
})

afterEach(async() => {
    for(const made of opened.splice(0)) made.close()
    await server.close()
})

// --- Tests ---

describe("NetSync", () => {
    test("viewer joining → hears its first message as it stands then, at once", async() => {
        const main = sync(() => NetSync.host(nodeNet(), server.url, "battle"))
        const code = await main.ready
        let first = "first"
        main.onPeer(() => first)
        first = "second"
        const viewer = sync(() => NetSync.view(nodeNet(), server.url, code))
        expect(await nextMessage(viewer)).toBe("second")
    })

    test("viewer joining → hears the first messages in the order asked, not those with nothing to tell", async() => {
        const main = sync(() => NetSync.host(nodeNet(), server.url, "battle"))
        const code = await main.ready
        main.onPeer(() => "battle")
        main.onPeer(() => null)
        main.onPeer(() => "travel")
        main.send("a move")
        const viewer = sync(() => NetSync.view(nodeNet(), server.url, code))
        const heard: string[] = []
        viewer.listen(message => heard.push(message))
        await viewer.ready
        while(heard.length < 2) await new Promise(resolve => setTimeout(resolve, 10))
        expect(heard).toEqual(["battle", "travel"])
    })

    test("viewer connected → hears each message sent", async() => {
        const main = sync(() => NetSync.host(nodeNet(), server.url, "battle"))
        const code = await main.ready
        const viewer = sync(() => NetSync.view(nodeNet(), server.url, code))
        await viewer.ready
        await waitForViewers(main, 1)
        const heard = nextMessage(viewer)
        main.send("round 2")
        expect(await heard).toBe("round 2")
    })

    test("unknown code → ready fails with not-found", async() => {
        const viewer = sync(() => NetSync.view(nodeNet(), server.url, "NOPE22"))
        await expect(viewer.ready).rejects.toMatchObject({ reason: "not-found" })
    })

    test("viewer sending → error, a viewer only listens", async() => {
        const viewer = sync(() => NetSync.view(nodeNet(), server.url, "NOPE22"))
        await viewer.ready.catch(() => {})
        expect(() => viewer.send("hi")).toThrow()
    })

    test("viewer only watching → no way to the main client", () => {
        const viewer = sync(() => NetSync.view(nodeNet(), server.url, "NOPE22"))
        expect(viewer.link).toBe(null)
        expect(viewer.room).toBe(null)
        void viewer.ready.catch(() => {})
    })

    test("guest saying something before it connects → heard by the main client once connected", async() => {
        const main = sync(() => NetSync.host(nodeNet(), server.url, "battle"))
        const code = await main.ready
        main.onPeer(() => "where the game is")
        const joined = joinedOf(main)
        const guest = sync(() => NetSync.view(nodeNet(), server.url, code, true))
        guest.link?.send("I came to play")
        const peer = await joined
        expect(await nextMessage(peer)).toBe("I came to play")
    })

    test("main client answering a guest → heard by that guest alone", async() => {
        const main = sync(() => NetSync.host(nodeNet(), server.url, "battle"))
        const code = await main.ready
        main.onPeer(() => "where the game is")
        const joined = joinedOf(main)
        const guest = sync(() => NetSync.view(nodeNet(), server.url, code, true))
        const first = nextMessage(guest)
        const peer = await joined
        expect(await first).toBe("where the game is")
        const other = sync(() => NetSync.view(nodeNet(), server.url, code))
        const heard: string[] = []
        other.listen(message => heard.push(message))
        await other.ready
        while(heard.length < 1) await new Promise(resolve => setTimeout(resolve, 10))
        const answer = nextMessage(guest)
        peer.send("you play the Lancier")
        expect(await answer).toBe("you play the Lancier")
        expect(heard).toEqual(["where the game is"])
    })

    test("guest leaving → told to the main client, with its id", async() => {
        const main = sync(() => NetSync.host(nodeNet(), server.url, "battle"))
        const code = await main.ready
        const joined = joinedOf(main)
        const left = new Promise<SyncPeer>(resolve => main.room?.onLeave(resolve))
        const guest = NetSync.view(nodeNet(), server.url, code, true)
        await guest.ready
        const peer = await joined
        guest.close()
        expect((await left).id).toBe(peer.id)
    })
})

/** The next client connecting to the main client. */
function joinedOf(main: NetSync): Promise<SyncPeer> {
    return new Promise(resolve => main.room?.onJoin(resolve))
}

/** Wait until the main client has this many viewers connected. */
async function waitForViewers(main: NetSync, count: number): Promise<void> {
    while(main.viewers < count) await new Promise(resolve => setTimeout(resolve, 10))
}
