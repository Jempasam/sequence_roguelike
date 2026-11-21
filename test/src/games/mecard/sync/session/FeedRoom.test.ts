import { FeedRoom } from "@game/core/mecard/sync"
import type { SyncPeer } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

const PEER: SyncPeer = { id: "p", send: () => {}, listen: () => ({ remove: () => {} }) }

/** A room that records its four events. */
function room() {
    const room = new FeedRoom()
    const events: string[] = []
    room.onJoin(peer => events.push(`join ${peer.id}`))
    room.onLost(peer => events.push(`lost ${peer.id}`))
    room.onBack(peer => events.push(`back ${peer.id}`))
    room.onLeave(peer => events.push(`leave ${peer.id}`))
    return { room, events }
}

describe("FeedRoom", () => {
    test("tells only what it is told to, each on its own event", () => {
        const { room: feed, events } = room()
        feed.join(PEER)
        feed.lose(PEER)
        feed.back(PEER)
        feed.leave(PEER)
        expect(events).toEqual(["join p", "lost p", "back p", "leave p"])
    })

    test("nothing happens by itself", () => {
        const { events } = room()
        expect(events).toEqual([])
    })

    test("several handlers → called in the order they were added", () => {
        const feed = new FeedRoom()
        const order: string[] = []
        feed.onJoin(() => order.push("a"))
        feed.onJoin(() => order.push("b"))
        feed.join(PEER)
        expect(order).toEqual(["a", "b"])
    })

    test("a handler disposed → no longer told", () => {
        const feed = new FeedRoom()
        const heard: string[] = []
        const handle = feed.onLeave(peer => heard.push(peer.id))
        handle.remove()
        feed.leave(PEER)
        expect(heard).toEqual([])
    })

    test("a handler that disposes itself while told → the others are still told", () => {
        const feed = new FeedRoom()
        const heard: string[] = []
        const own = feed.onJoin(() => {
            heard.push("own")
            own.remove()
        })
        feed.onJoin(() => heard.push("other"))
        feed.join(PEER)
        feed.join(PEER)
        expect(heard).toEqual(["own", "other", "other"])
    })

    test("dispose → none of the four events is told any more", () => {
        const { room: feed, events } = room()
        feed.dispose()
        feed.join(PEER)
        feed.lose(PEER)
        feed.back(PEER)
        feed.leave(PEER)
        expect(events).toEqual([])
    })
})
