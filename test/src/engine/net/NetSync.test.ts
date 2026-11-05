import { NetSync } from "@game/core"
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
    test("viewer joining after messages retained → hears the last one of the name at once", async() => {
        const main = sync(() => NetSync.host(nodeNet(), server.url, "battle"))
        const code = await main.ready
        main.send("first", "battle")
        main.send("second", "battle")
        const viewer = sync(() => NetSync.view(nodeNet(), server.url, code))
        expect(await nextMessage(viewer)).toBe("second")
    })

    test("viewer joining after two names → hears the last of each, the latest last, not what was not kept", async() => {
        const main = sync(() => NetSync.host(nodeNet(), server.url, "battle"))
        const code = await main.ready
        main.send("old travel", "travel")
        main.send("battle", "battle")
        main.send("travel", "travel")
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
})

/** Wait until the main client has this many viewers connected. */
async function waitForViewers(main: NetSync, count: number): Promise<void> {
    while(main.viewers < count) await new Promise(resolve => setTimeout(resolve, 10))
}
