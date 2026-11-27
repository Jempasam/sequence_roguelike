import { Outbox } from "@game/core-src/engine/net/Outbox"
import { describe, expect, test } from "vitest"

describe("Outbox", () => {
    test("messages held → drained in the order they were held, then forgotten", () => {
        const outbox = new Outbox(10)
        outbox.hold("a")
        outbox.hold("b")
        outbox.hold("c")
        const given: string[] = []
        outbox.drain(message => given.push(message))
        expect(given).toEqual(["a", "b", "c"])
        expect(outbox.size).toBe(0)
        outbox.drain(message => given.push(message))
        expect(given).toEqual(["a", "b", "c"])
    })

    test("more than the limit → the oldest are dropped, and it is told once", () => {
        const outbox = new Outbox(2)
        const told = ["a", "b", "c", "d"].map(message => outbox.hold(message))
        expect(told).toEqual([false, false, true, false])
        const given: string[] = []
        outbox.drain(message => given.push(message))
        expect(given).toEqual(["c", "d"])
    })

    test("overflow told, then drained → told again the next time it overflows", () => {
        const outbox = new Outbox(1)
        outbox.hold("a")
        expect(outbox.hold("b")).toBe(true)
        outbox.drain(() => {})
        outbox.hold("c")
        expect(outbox.hold("d")).toBe(true)
    })

    test("cleared → nothing is given", () => {
        const outbox = new Outbox(5)
        outbox.hold("a")
        outbox.clear()
        const given: string[] = []
        outbox.drain(message => given.push(message))
        expect(given).toEqual([])
    })
})
