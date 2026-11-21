import { Audience } from "@game/core/mecard/sync"
import type { SyncPeer } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** A client that keeps what it is told. */
function peer(id: string): SyncPeer & { readonly heard: string[] } {
    const heard: string[] = []
    return { id, heard, send: message => { heard.push(message) }, listen: () => ({ remove: () => {} }) }
}

describe("Audience", () => {
    test("send → every client of the audience hears it, and no one else", () => {
        const audience = new Audience()
        const a = peer("a")
        const b = peer("b")
        const outsider = peer("c")
        audience.add(a)
        audience.add(b)
        audience.send("hello")
        expect(a.heard).toEqual(["hello"])
        expect(b.heard).toEqual(["hello"])
        expect(outsider.heard).toEqual([])
    })

    test("has, peers → follow who was added and removed, in the order they came", () => {
        const audience = new Audience()
        const a = peer("a")
        const b = peer("b")
        audience.add(a)
        audience.add(b)
        expect(audience.has("a")).toBe(true)
        expect(audience.peers).toEqual([a, b])
        audience.remove("a")
        expect(audience.has("a")).toBe(false)
        expect(audience.peers).toEqual([b])
    })

    test("a client removed → no longer told, and removing a stranger changes nothing", () => {
        const audience = new Audience()
        const a = peer("a")
        audience.add(a)
        audience.remove("nobody")
        audience.remove("a")
        audience.send("x")
        expect(a.heard).toEqual([])
    })

    test("a client added again under the same id → told once, by the newest peer", () => {
        const audience = new Audience()
        const first = peer("a")
        const second = peer("a")
        audience.add(first)
        audience.add(second)
        audience.send("x")
        expect(first.heard).toEqual([])
        expect(second.heard).toEqual(["x"])
    })

    test("a client added → greeted at once with the first messages, in the order they were asked for", () => {
        const audience = new Audience()
        audience.onPeer(() => "first")
        audience.onPeer(() => null)
        audience.onPeer(() => "second")
        const a = peer("a")
        audience.add(a)
        expect(a.heard).toEqual(["first", "second"])
    })

    test("a first message is read when the client comes, not when asked for", () => {
        const audience = new Audience()
        let value = "old"
        audience.onPeer(() => value)
        value = "new"
        const a = peer("a")
        audience.add(a)
        expect(a.heard).toEqual(["new"])
    })

    test("greet → gives a client the first messages again, as they stand", () => {
        const audience = new Audience()
        let value = "one"
        audience.onPeer(() => value)
        const a = peer("a")
        audience.add(a)
        value = "two"
        audience.greet(a)
        expect(a.heard).toEqual(["one", "two"])
    })

    test("a first message disposed → no longer given", () => {
        const audience = new Audience()
        const handle = audience.onPeer(() => "first")
        handle.remove()
        const a = peer("a")
        audience.add(a)
        expect(a.heard).toEqual([])
    })

    test("dispose → nobody is told any more, and no first message is given", () => {
        const audience = new Audience()
        const a = peer("a")
        audience.add(a)
        audience.onPeer(() => "first")
        audience.dispose()
        audience.send("x")
        const b = peer("b")
        audience.add(b)
        expect(a.heard).toEqual([])
        expect(b.heard).toEqual([])
        expect(audience.peers).toEqual([b])
    })

    test("a client that is removed while a message is sent → the others still hear it", () => {
        const audience = new Audience()
        const heard: string[] = []
        audience.add({
            id: "a",
            send: () => audience.remove("b"),
            listen: () => ({ remove: () => {} }),
        })
        audience.add({ id: "b", send: message => { heard.push(message) }, listen: () => ({ remove: () => {} }) })
        audience.send("x")
        expect(heard).toEqual(["x"])
    })
})
