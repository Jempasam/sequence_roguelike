import { LocalRoom, LocalSync, MergedRoom, MergedSender } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

function merged() {
    const first = new LocalRoom()
    const second = new LocalRoom()
    const room = new MergedRoom([first, second])
    const log: string[] = []
    room.onJoin(peer => log.push(`join ${peer.id}`))
    room.onLost(peer => log.push(`lost ${peer.id}`))
    room.onBack(peer => log.push(`back ${peer.id}`))
    room.onLeave(peer => log.push(`leave ${peer.id}`))
    return { first, second, room, log }
}

// --- Tests ---

describe("MergedRoom", () => {
    test("the clients of each room → the clients of the one", () => {
        const { first, second, log } = merged()
        first.join("a")
        second.join("b")
        expect(log).toEqual(["join a", "join b"])
    })

    test("a connection lost, back, and a client leaving → told whichever room it is in", () => {
        const { first, second, log } = merged()
        first.join("a")
        second.join("b")
        first.drop("a")
        second.drop("b")
        first.back("a")
        second.back("b")
        first.leave("a")
        second.leave("b")
        expect(log.slice(2)).toEqual(["lost a", "lost b", "back a", "back b", "leave a", "leave b"])
    })

    test("a handle disposed → none of the rooms tells it any more", () => {
        const first = new LocalRoom()
        const second = new LocalRoom()
        const joined: string[] = []
        const handle = new MergedRoom([first, second]).onJoin(peer => joined.push(peer.id))
        first.join("a")
        handle.remove()
        first.join("b")
        second.join("c")
        expect(joined).toEqual(["a"])
    })

    test("no room → nothing is ever told", () => {
        const joined: string[] = []
        new MergedRoom([]).onJoin(peer => joined.push(peer.id)).remove()
        expect(joined).toEqual([])
    })
})

describe("MergedSender", () => {
    test("a message sent → heard on each channel", () => {
        const first = new LocalSync()
        const second = new LocalSync()
        const heard: string[] = []
        first.listen(message => heard.push(`first ${message}`))
        second.listen(message => heard.push(`second ${message}`))
        new MergedSender([first, second]).send("hello")
        expect(heard).toEqual(["first hello", "second hello"])
    })

    test("a viewer connecting to either channel → given the first message", () => {
        const first = new LocalSync()
        const second = new LocalSync()
        new MergedSender([first, second]).onPeer(() => "state")
        const heard: string[] = []
        first.listen(message => heard.push(message))
        second.listen(message => heard.push(message))
        expect(heard).toEqual(["state", "state"])
    })

    test("a handle disposed → no first message is given any more", () => {
        const first = new LocalSync()
        const second = new LocalSync()
        const handle = new MergedSender([first, second]).onPeer(() => "state")
        handle.remove()
        const heard: string[] = []
        first.listen(message => heard.push(message))
        second.listen(message => heard.push(message))
        expect(heard).toEqual([])
    })
})
