import { Gathering, MANUAL } from "@game/core-src/games/mecard/sync/Gathering"
import { LobbyRoom } from "@game/core-src/games/mecard/sync/lobby/LobbyRoom"
import { GuestStage, HostStage } from "@game/core-src/games/mecard/sync/lobby/Stage"
import { JOIN_TOPIC, LocalRoom, LocalSync, SyncTopic } from "@game/core-src/games/mecard/sync/SyncChannel"
import type { SyncPeer } from "@game/core-src/platform/SyncPort"
import { describe, expect, test } from "vitest"

/** Let what was deferred to the end of the current task happen. */
async function settle(): Promise<void> {
    await Promise.resolve()
    await Promise.resolve()
}

/** A lobby over a room, as it is when its clients connect before any game. */
function lobby(): { readonly room: LocalRoom, readonly lobby: LobbyRoom, readonly channel: LocalSync } {
    const room = new LocalRoom()
    return { room, lobby: new LobbyRoom(room), channel: new LocalSync() }
}

describe("HostStage", () => {
    test("client connected before the game → told to what the game adds, once it is added", async() => {
        const { room, lobby: lobbyRoom, channel } = lobby()
        room.join("early")
        const stage = new HostStage(lobbyRoom, channel)
        const told: string[] = []
        stage.room.onJoin(peer => told.push(peer.id))
        expect(told).toEqual([])
        await settle()
        expect(told).toEqual(["early"])
    })

    test("client connecting before and after → each told once", async() => {
        const { room, lobby: lobbyRoom, channel } = lobby()
        room.join("a")
        const stage = new HostStage(lobbyRoom, channel)
        const told: string[] = []
        stage.room.onJoin(peer => told.push(peer.id))
        room.join("b")
        await settle()
        room.join("c")
        await settle()
        expect(told.sort()).toEqual(["a", "b", "c"])
    })

    test("client that left → not told to what is added later", async() => {
        const { room, lobby: lobbyRoom, channel } = lobby()
        room.join("gone")
        room.join("here")
        room.leave("gone")
        const stage = new HostStage(lobbyRoom, channel)
        const told: string[] = []
        stage.room.onJoin(peer => told.push(peer.id))
        await settle()
        expect(told).toEqual(["here"])
    })

    test("client lost before the game → told as lost to what is added, and as back later", async() => {
        const { room, lobby: lobbyRoom, channel } = lobby()
        room.join("away")
        room.join("here")
        room.drop("away")
        const stage = new HostStage(lobbyRoom, channel)
        const lost: string[] = []
        const back: string[] = []
        stage.room.onLost(peer => lost.push(peer.id))
        stage.room.onBack(peer => back.push(peer.id))
        await settle()
        room.back("away")
        expect(lost).toEqual(["away"])
        expect(back).toEqual(["away"])
    })

    test("a gathering made after its clients connected → takes in the ones that say they came", async() => {
        const { room, lobby: lobbyRoom, channel } = lobby()
        const link = room.join("early")
        const stage = new HostStage(lobbyRoom, channel)
        const gathering = new Gathering(stage.room, MANUAL)
        await settle()
        JOIN_TOPIC.link(link).send("")
        expect(gathering.members.map(member => member.id)).toEqual(["early"])
    })

    test("greetAll → each client reachable hears the first messages, in the order asked", () => {
        const { room, lobby: lobbyRoom, channel } = lobby()
        const hears: string[][] = [[], []]
        room.join("a").listen(message => hears[0].push(message))
        room.join("lost").listen(message => hears[1].push(message))
        room.drop("lost")
        const stage = new HostStage(lobbyRoom, channel)
        const sender = new SyncTopic("state").sender(stage.sender)
        sender.onPeer(() => "one")
        sender.onPeer(() => null)
        sender.onPeer(() => "two")
        stage.greetAll()
        expect(hears[0]).toEqual(["state:one", "state:two"])
        expect(hears[1]).toEqual([])
    })

    test("first messages asked on the stage → also asked of the network, for clients connecting later", () => {
        const { lobby: lobbyRoom, channel } = lobby()
        const stage = new HostStage(lobbyRoom, channel)
        stage.sender.onPeer(() => "where the game is")
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        expect(heard).toEqual(["where the game is"])
    })

    test("disposed → nothing is told to the game, and the network is not asked for first messages", async() => {
        const { room, lobby: lobbyRoom, channel } = lobby()
        const stage = new HostStage(lobbyRoom, channel)
        const told: SyncPeer[] = []
        stage.room.onJoin(peer => told.push(peer))
        stage.sender.onPeer(() => "first")
        stage.dispose()
        room.join("late")
        await settle()
        expect(told).toEqual([])
        const heard: string[] = []
        channel.listen(message => heard.push(message))
        expect(heard).toEqual([])
    })

    test("two games one after the other → the second is told of the clients as the first was", async() => {
        const { room, lobby: lobbyRoom, channel } = lobby()
        room.join("a")
        const first = new HostStage(lobbyRoom, channel)
        first.room.onJoin(() => {})
        await settle()
        first.dispose()
        const second = new HostStage(lobbyRoom, channel)
        const told: string[] = []
        second.room.onJoin(peer => told.push(peer.id))
        await settle()
        expect(told).toEqual(["a"])
    })
})

describe("GuestStage", () => {
    test("disposed → what the game still listened to is dropped, the link and the source with it", () => {
        const room = new LocalRoom()
        let toGuest: SyncPeer|null = null
        room.onJoin(peer => { toGuest = peer })
        const link = room.join("me")
        const channel = new LocalSync()
        const stage = new GuestStage(link, channel)
        const heard: string[] = []
        stage.link?.listen(message => heard.push(`link ${message}`))
        stage.source.listen(message => heard.push(`source ${message}`))
        const peer = toGuest as SyncPeer|null
        peer?.send("from the host")
        channel.send("broadcast")
        stage.dispose()
        peer?.send("later")
        channel.send("after")
        expect(heard).toEqual(["link from the host", "source broadcast"])
    })

    test("watching → no link, sources still listened to", () => {
        const channel = new LocalSync()
        const stage = new GuestStage(null, channel)
        const heard: string[] = []
        stage.source.listen(message => heard.push(message))
        channel.send("hello")
        expect(stage.link).toBe(null)
        expect(heard).toEqual(["hello"])
    })
})
