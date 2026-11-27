import { Participant } from "@game/core-src/games/mecard/sync/session/Participant"
import { LocalRoom, SyncTopic } from "@game/core-src/games/mecard/sync/SyncChannel"
import type { SyncPeer } from "@game/core-src/platform/SyncPort"
import { describe, expect, test } from "vitest"

const TOPIC = new SyncTopic("t")

/** A peer of a room within the program, and the link of the client on its end. */
function joined(id = "p1") {
    const room = new LocalRoom()
    const peers: SyncPeer[] = []
    room.onJoin(peer => peers.push(peer))
    const link = room.join(id)
    return { peer: peers[0], link }
}

describe("Participant", () => {
    test("new → named by its id, connected, a spectator, with no options and no seat", () => {
        const participant = new Participant("p1", null)
        expect(participant.id).toBe("p1")
        expect(participant.name).toBe("p1")
        expect(participant.connection).toBe("connected")
        expect(participant.presence).toBe("spectator")
        expect(participant.options).toEqual({})
        expect(participant.seat).toBeNull()
        expect(participant.isPlayer).toBe(false)
    })

    test("isPlayer → follows its presence", () => {
        const participant = new Participant("p1", null)
        participant.presence = "player"
        expect(participant.isPlayer).toBe(true)
        participant.presence = "left"
        expect(participant.isPlayer).toBe(false)
    })

    test("tell → reaches the client on the topic, prefixed", () => {
        const { peer, link } = joined()
        const heard: string[] = []
        link.listen(message => heard.push(message))
        new Participant("p1", peer).tell(TOPIC, "hello")
        expect(heard).toEqual(["t:hello"])
    })

    test("listen → hears what the client says on the topic only", () => {
        const { peer, link } = joined()
        const heard: string[] = []
        new Participant("p1", peer).listen(TOPIC, text => heard.push(text))
        link.send("t:one")
        link.send("other:two")
        expect(heard).toEqual(["one"])
    })

    test("listen disposed → hears no more", () => {
        const { peer, link } = joined()
        const heard: string[] = []
        const handle = new Participant("p1", peer).listen(TOPIC, text => heard.push(text))
        handle.remove()
        link.send("t:one")
        expect(heard).toEqual([])
    })

    test("the host, with no peer → tell sends nothing and listen hears nothing, without a throw", () => {
        const host = new Participant("host", null)
        expect(() => host.tell(TOPIC, "x")).not.toThrow()
        const handle = host.listen(TOPIC, () => { throw new Error("nothing to hear") })
        expect(() => handle.remove()).not.toThrow()
    })
})
