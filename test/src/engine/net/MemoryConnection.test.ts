import { MemoryConnection } from "@game/core"
import type { NetError } from "@game/core"
import { describe, expect, test } from "vitest"

import { nextMessage, nextOnChannel, once } from "../../fixtures/netServer"

// --- Tests ---

describe("MemoryConnection.pair", () => {
    test("pair → both ends open soon after, not during the call", async() => {
        const [a, b] = MemoryConnection.pair()
        expect(a.state).toBe("connecting")
        await Promise.all([a.opened, b.opened])
        expect([a.state, b.state]).toEqual(["open", "open"])
    })

    test("send → heard by the other end, with its channel", async() => {
        const [a, b] = MemoryConnection.pair()
        await a.opened
        const heard = nextOnChannel(b)
        a.send("ping", "unreliable")
        expect(await heard).toEqual(["ping", "unreliable"])
    })

    test("send before open → error", () => {
        const [a] = MemoryConnection.pair()
        expect(() => a.send("too early")).toThrow()
    })

    test("close → both ends closed, the other told", async() => {
        const [a, b] = MemoryConnection.pair()
        await a.opened
        const closed = once<NetError>(handler => b.onClose(handler))
        a.close()
        expect((await closed).reason).toBe("closed")
        expect(b.state).toBe("closed")
    })

    test("close handler added after the close → told soon after", async() => {
        const [a] = MemoryConnection.pair()
        await a.opened
        a.close()
        expect((await once<NetError>(handler => a.onClose(handler))).reason).toBe("closed")
    })

    test("messages → kept in order", async() => {
        const [a, b] = MemoryConnection.pair()
        await a.opened
        const heard: string[] = []
        b.listen(message => heard.push(message))
        a.send("1")
        a.send("2")
        await nextMessage(b)
        expect(heard).toEqual(["1", "2"])
    })
})
