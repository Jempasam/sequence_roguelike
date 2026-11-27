import { LocalRoom, LocalSync, SyncTopic } from "@game/core-src/games/mecard/sync/SyncChannel"
import type { SyncPeer } from "@game/core-src/platform/SyncPort"
import { describe, expect, test } from "vitest"

describe("SyncTopic", () => {
    test("sender → the messages go to the channel prefixed by the topic", () => {
        const channel = new LocalSync()
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        new SyncTopic("a").sender(channel).send("hello")
        expect(heard).toEqual(["a:hello"])
    })

    test("source → hears only the messages of its own topic, unprefixed", () => {
        const channel = new LocalSync()
        const a: string[] = []
        const b: string[] = []
        new SyncTopic("a").source(channel).listen(message => a.push(message))
        new SyncTopic("b").source(channel).listen(message => b.push(message))
        new SyncTopic("a").sender(channel).send("one")
        new SyncTopic("b").sender(channel).send("two")
        channel.send("unprefixed")
        expect(a).toEqual(["one"])
        expect(b).toEqual(["two"])
    })

    test("a topic whose name starts another's → the shorter does not hear the longer", () => {
        const channel = new LocalSync()
        const heard: string[] = []
        new SyncTopic("seat").source(channel).listen(message => heard.push(message))
        new SyncTopic("seat-take").sender(channel).send("x")
        expect(heard).toEqual([])
    })

    test("a message that holds the separator → kept whole", () => {
        const channel = new LocalSync()
        const heard: string[] = []
        const topic = new SyncTopic("a")
        topic.source(channel).listen(message => heard.push(message))
        topic.sender(channel).send("b:c:d")
        expect(heard).toEqual(["b:c:d"])
    })

    test("an empty message → heard as an empty one", () => {
        const channel = new LocalSync()
        const heard: string[] = []
        const topic = new SyncTopic("a")
        topic.source(channel).listen(message => heard.push(message))
        topic.sender(channel).send("")
        expect(heard).toEqual([""])
    })

    test("disposed listener → hears no more", () => {
        const channel = new LocalSync()
        const heard: string[] = []
        const topic = new SyncTopic("a")
        const handle = topic.source(channel).listen(message => heard.push(message))
        handle.remove()
        topic.sender(channel).send("x")
        expect(heard).toEqual([])
    })

    test("onPeer through a topic → the first message is prefixed, and none stays none", () => {
        const channel = new LocalSync()
        const topic = new SyncTopic("a")
        topic.sender(channel).onPeer(() => "first")
        topic.sender(channel).onPeer(() => null)
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        expect(heard).toEqual(["a:first"])
    })

    test("link → writes and hears only its topic", () => {
        const room = new LocalRoom()
        const peers: SyncPeer[] = []
        room.onJoin(peer => peers.push(peer))
        const link = room.join("p")
        const topic = new SyncTopic("a")
        const fromClient: string[] = []
        const fromHost: string[] = []
        topic.link(peers[0]).listen(message => fromClient.push(message))
        topic.link(link).listen(message => fromHost.push(message))
        topic.link(link).send("up")
        topic.link(peers[0]).send("down")
        peers[0].send("b:other")
        expect(fromClient).toEqual(["up"])
        expect(fromHost).toEqual(["down"])
    })
})

describe("LocalSync", () => {
    test("delivers at once to every listener, in the order they listened", () => {
        const channel = new LocalSync()
        const heard: string[] = []
        channel.listen(message => heard.push(`a${message}`))
        channel.listen(message => heard.push(`b${message}`))
        channel.send("1")
        expect(heard).toEqual(["a1", "b1"])
    })

    test("held → nothing arrives until flushed, then in order, once", () => {
        const channel = new LocalSync(true)
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        channel.send("1")
        channel.send("2")
        expect(heard).toEqual([])
        expect(channel.waiting).toBe(2)
        channel.flush()
        channel.flush()
        expect(heard).toEqual(["1", "2"])
        expect(channel.waiting).toBe(0)
    })

    test("a viewer connecting → told the first messages at once, even when held, in the order asked", () => {
        const channel = new LocalSync(true)
        channel.onPeer(() => "first")
        channel.onPeer(() => "second")
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        expect(heard).toEqual(["first", "second"])
    })

    test("a first message read when the viewer connects, not when asked for", () => {
        const channel = new LocalSync()
        let value = "old"
        channel.onPeer(() => value)
        value = "new"
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        expect(heard).toEqual(["new"])
    })

    test("disposed first message → not told to the next viewer", () => {
        const channel = new LocalSync()
        const handle = channel.onPeer(() => "first")
        handle.remove()
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        expect(heard).toEqual([])
    })

    test("a listener that listens during a delivery → hears the next message, not this one", () => {
        const channel = new LocalSync()
        const late: string[] = []
        let added = false
        channel.listen(() => {
            if(added) return
            added = true
            channel.listen(message => late.push(message))
        })
        channel.send("1")
        channel.send("2")
        expect(late).toEqual(["2"])
    })
})

describe("LocalRoom", () => {
    /** A room with the peers it told of, by id, and what each said of its events. */
    function room() {
        const room = new LocalRoom()
        const events: string[] = []
        const peers = new Map<string, SyncPeer>()
        room.onJoin(peer => { peers.set(peer.id, peer); events.push(`join ${peer.id}`) })
        room.onLost(peer => events.push(`lost ${peer.id}`))
        room.onBack(peer => events.push(`back ${peer.id}`))
        room.onLeave(peer => events.push(`leave ${peer.id}`))
        return { room, events, peers }
    }

    test("join → the room hears of the peer, and each side hears the other", () => {
        const { room: r, events, peers } = room()
        const link = r.join("a")
        const up: string[] = []
        const down: string[] = []
        peers.get("a")?.listen(message => up.push(message))
        link.listen(message => down.push(message))
        link.send("to host")
        peers.get("a")?.send("to client")
        expect(events).toEqual(["join a"])
        expect(up).toEqual(["to host"])
        expect(down).toEqual(["to client"])
    })

    test("two clients → what one says is not heard by the other", () => {
        const { room: r, peers } = room()
        const a = r.join("a")
        const b = r.join("b")
        const heardByB: string[] = []
        b.listen(message => heardByB.push(message))
        a.send("x")
        peers.get("a")?.send("y")
        expect(heardByB).toEqual([])
    })

    test("drop → told, and what is sent either way is lost meanwhile; back → told, and it flows again", () => {
        const { room: r, events, peers } = room()
        const link = r.join("a")
        const up: string[] = []
        const down: string[] = []
        peers.get("a")?.listen(message => up.push(message))
        link.listen(message => down.push(message))
        r.drop("a")
        link.send("lost up")
        peers.get("a")?.send("lost down")
        r.back("a")
        link.send("up")
        peers.get("a")?.send("down")
        expect(events).toEqual(["join a", "lost a", "back a"])
        expect(up).toEqual(["up"])
        expect(down).toEqual(["down"])
    })

    test("drop twice, or back without a drop, or on a stranger → nothing is told", () => {
        const { room: r, events } = room()
        r.join("a")
        r.back("a")
        r.back("nobody")
        r.drop("nobody")
        r.drop("a")
        r.drop("a")
        expect(events).toEqual(["join a", "lost a"])
    })

    test("leave → told once, and a stranger leaving is left alone", () => {
        const { room: r, events } = room()
        r.join("a")
        r.leave("a")
        r.leave("a")
        r.leave("nobody")
        expect(events).toEqual(["join a", "leave a"])
    })

    test("a client that left → can not be dropped or brought back", () => {
        const { room: r, events } = room()
        r.join("a")
        r.leave("a")
        r.drop("a")
        r.back("a")
        expect(events).toEqual(["join a", "leave a"])
    })

    test("disposed handlers → hear no more", () => {
        const r = new LocalRoom()
        const events: string[] = []
        r.onJoin(peer => events.push(peer.id)).remove()
        r.join("a")
        expect(events).toEqual([])
    })
})
