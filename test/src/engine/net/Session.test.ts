import {
    BadSecretFault, ConnectionLostFault, Fault, HostLostServerFault, ManualScheduler, MemoryConnection,
    NetError, RefusedFault, RoomNotFoundFault, SessionClient, SessionExpiredFault, SessionHost,
    VersionMismatchFault, writeSession,
} from "@game/core"
import type { Connection, SessionInfo, SessionPeer } from "@game/core"
import { describe, expect, test } from "vitest"

import { FakeHostSocket, settle } from "../../fixtures/sessions"

// --- Fixture builders ---

const GRACE = 10_000

interface Hosting {
    readonly socket: FakeHostSocket
    readonly timer: ManualScheduler
    readonly host: SessionHost
    readonly joined: SessionPeer[]
    readonly lost: SessionPeer[]
    readonly back: SessionPeer[]
    readonly gone: SessionPeer[]
    readonly faults: Fault[]
}

function hosting(): Hosting {
    const socket = new FakeHostSocket()
    const timer = new ManualScheduler()
    const host = new SessionHost(socket, { graceMs: GRACE, timer })
    const joined: SessionPeer[] = []
    const lost: SessionPeer[] = []
    const back: SessionPeer[] = []
    const gone: SessionPeer[] = []
    const faults: Fault[] = []
    host.peerJoined.add(peer => joined.push(peer))
    host.peerLost.add(peer => lost.push(peer))
    host.peerBack.add(peer => back.push(peer))
    host.peerGone.add(peer => gone.push(peer))
    host.faulted.add(fault => faults.push(fault))
    return { socket, timer, host, joined, lost, back, gone, faults }
}

function session(id: string, secret = "s3cret", version = 1): SessionInfo {
    return { id, secret, version }
}

interface Arrival {
    readonly member: { readonly id: string }
    readonly connection: Connection
    readonly admitted: boolean
}

/** A client of a session coming, admitted as the room would, its connection open. */
async function arrive(
    { socket, host }: Hosting,
    info: SessionInfo,
): Promise<Arrival> {
    const data = writeSession(info)
    const admitted = await host.admit({ id: `pending-${socket.count}`, data })
    if(!admitted) return { member: { id: "" }, connection: null as unknown as Connection, admitted }
    const arrival = socket.arrive(data)
    await settle()
    return { member: arrival.member, connection: arrival.connection, admitted }
}

// --- Tests ---

describe("SessionHost", () => {
    test("a new session → let in, then told as a peer with the id of its session", async() => {
        const hub = hosting()
        const { admitted } = await arrive(hub, session("a"))
        expect(admitted).toBe(true)
        expect(hub.joined.map(peer => peer.id)).toEqual(["a"])
        expect(hub.faults).toEqual([])
    })

    test("messages → heard both ways by the peer and the client", async() => {
        const hub = hosting()
        const { connection } = await arrive(hub, session("a"))
        const heard: string[] = []
        hub.joined[0].listen(message => heard.push(message))
        const answers: string[] = []
        connection.listen(message => answers.push(message))
        connection.send("hello host")
        hub.joined[0].send("hello client")
        await settle()
        expect(heard).toEqual(["hello host"])
        expect(answers).toEqual(["hello client"])
    })

    test("a wrong secret → refused with a BadSecretFault, the real client untouched", async() => {
        const hub = hosting()
        await arrive(hub, session("a"))
        const { admitted } = await arrive(hub, session("a", "stolen"))
        expect(admitted).toBe(false)
        expect(hub.faults).toHaveLength(1)
        expect(hub.faults[0]).toBeInstanceOf(BadSecretFault)
        expect(hub.faults[0].who).toBe("a")
        expect(hub.joined).toHaveLength(1)
        expect(hub.back).toEqual([])
    })

    test("another version → refused with a VersionMismatchFault", async() => {
        const hub = hosting()
        const { admitted } = await arrive(hub, session("a", "s3cret", 99))
        expect(admitted).toBe(false)
        expect(hub.faults[0]).toBeInstanceOf(VersionMismatchFault)
        expect(hub.joined).toEqual([])
    })

    test("no session at all → refused with a VersionMismatchFault with no version", async() => {
        const hub = hosting()
        expect(await hub.host.admit({ id: "x", data: "alice" })).toBe(false)
        const [fault] = hub.faults
        expect(fault).toBeInstanceOf(VersionMismatchFault)
        expect((fault as VersionMismatchFault).theirs).toBe(null)
    })

    test("a connection lost → the peer lost, sending to it dropped, no one gone yet", async() => {
        const hub = hosting()
        const { member, connection } = await arrive(hub, session("a"))
        const answers: string[] = []
        connection.listen(message => answers.push(message))
        hub.socket.lose({ id: member.id, data: null })
        expect(hub.lost.map(peer => peer.id)).toEqual(["a"])
        hub.joined[0].send("nobody hears this")
        await settle()
        expect(answers).toEqual([])
        hub.timer.advance(GRACE - 1)
        expect(hub.gone).toEqual([])
    })

    test("the grace over → the peer gone, and its session refused with a SessionExpiredFault", async() => {
        const hub = hosting()
        const { member } = await arrive(hub, session("a"))
        hub.socket.lose({ id: member.id, data: null })
        hub.timer.advance(GRACE)
        expect(hub.gone.map(peer => peer.id)).toEqual(["a"])
        const { admitted } = await arrive(hub, session("a"))
        expect(admitted).toBe(false)
        expect(hub.faults.at(-1)).toBeInstanceOf(SessionExpiredFault)
    })

    test("a client coming back with its secret → the same peer, heard again, no longer lost nor gone", async() => {
        const hub = hosting()
        const first = await arrive(hub, session("a"))
        const [peer] = hub.joined
        const heard: string[] = []
        peer.listen(message => heard.push(message))
        hub.socket.lose({ id: first.member.id, data: null })
        const second = await arrive(hub, session("a"))
        expect(second.admitted).toBe(true)
        expect(hub.joined).toHaveLength(1)
        expect(hub.back).toEqual([peer])
        const answers: string[] = []
        second.connection.listen(message => answers.push(message))
        second.connection.send("I am back")
        peer.send("welcome back")
        await settle()
        expect(heard).toEqual(["I am back"])
        expect(answers).toEqual(["welcome back"])
        hub.timer.advance(GRACE * 2)
        expect(hub.gone).toEqual([])
    })

    test("a client coming back before the host saw the loss → replaces the old connection, still told back", async() => {
        const hub = hosting()
        const first = await arrive(hub, session("a"))
        const second = await arrive(hub, session("a"))
        expect(hub.back).toHaveLength(1)
        expect(first.connection.state).toBe("closed")
        // The old member leaving at last is not the loss of the client: it has a new connection.
        hub.socket.lose({ id: first.member.id, data: null })
        expect(hub.lost).toEqual([])
        expect(second.connection.state).toBe("open")
    })

    test("the host closing → every wait cancelled, the room closed", () => {
        const hub = hosting()
        hub.host.close()
        expect(hub.socket.isClosed).toBe(true)
    })

    test("the room lost by the host → ended with a HostLostServerFault, once", () => {
        const hub = hosting()
        const ended: Fault[] = []
        hub.host.ended.add(fault => ended.push(fault))
        hub.socket.closed.notify(new NetError("closed", "The server was lost."))
        hub.socket.closed.notify(new NetError("closed", "The server was lost."))
        expect(ended).toHaveLength(1)
        expect(ended[0]).toBeInstanceOf(HostLostServerFault)
    })

    test("as a room → joins, losses, returns and departures told to the game", async() => {
        const hub = hosting()
        const told: string[] = []
        const { room } = hub.host
        room.onJoin(peer => told.push(`join ${peer.id}`))
        room.onLost(peer => told.push(`lost ${peer.id}`))
        room.onBack(peer => told.push(`back ${peer.id}`))
        room.onLeave(peer => told.push(`leave ${peer.id}`))
        const first = await arrive(hub, session("a"))
        hub.socket.lose({ id: first.member.id, data: null })
        const second = await arrive(hub, session("a"))
        hub.socket.lose({ id: second.member.id, data: null })
        hub.timer.advance(GRACE)
        expect(told).toEqual(["join a", "lost a", "back a", "lost a", "leave a"])
    })
})

describe("SessionClient", () => {
    /** A client whose joins are those the test says, each settling with a connection or with a failure. */
    function client(joins: (() => Promise<Connection>)[]): {
        readonly client: SessionClient
        readonly timer: ManualScheduler
        readonly told: string[]
        readonly faults: Fault[]
        readonly ended: Fault[]
        readonly datas: unknown[]
    } {
        const timer = new ManualScheduler()
        const datas: unknown[] = []
        const made = new SessionClient(data => {
            datas.push(data)
            const next = joins.shift()
            return next ? next() : Promise.reject(new NetError("unreachable", "No more joins."))
        }, { timer, graceMs: GRACE, retryMs: 1_000, random: length => "x".repeat(length) })
        const told: string[] = []
        const faults: Fault[] = []
        const ended: Fault[] = []
        made.reconnecting.add(() => told.push("reconnecting"))
        made.reconnected.add(() => told.push("reconnected"))
        made.faulted.add(fault => faults.push(fault))
        made.ended.add(fault => ended.push(fault))
        return { client: made, timer, told, faults, ended, datas }
    }

    function opened(): { readonly client: Connection, readonly host: Connection } {
        const [client, host] = MemoryConnection.pair()
        return { client, host }
    }

    test("connect → the session said in what it tells the room of itself", async() => {
        const pair = opened()
        const { client: made, datas } = client([() => Promise.resolve(pair.client)])
        await made.connect()
        await settle()
        expect(made.isConnected).toBe(true)
        expect(datas).toEqual([writeSession(made.session)])
    })

    test("a room that cannot be found → ended with a RoomNotFoundFault, and connect never rejects", async() => {
        const { client: made, ended } = client([() => Promise.reject(new NetError("not-found", "No."))])
        await expect(made.connect()).resolves.toBeUndefined()
        expect(ended).toHaveLength(1)
        expect(ended[0]).toBeInstanceOf(RoomNotFoundFault)
    })

    test("a refusal at first → ended with a RefusedFault", async() => {
        const { client: made, ended } = client([() => Promise.reject(new NetError("refused", "No."))])
        await made.connect()
        expect(ended[0]).toBeInstanceOf(RefusedFault)
    })

    test("messages → heard from the host, sent to the host", async() => {
        const pair = opened()
        const { client: made } = client([() => Promise.resolve(pair.client)])
        await made.connect()
        await settle()
        const heard: string[] = []
        made.link.listen(message => heard.push(message))
        const toHost: string[] = []
        pair.host.listen(message => toHost.push(message))
        pair.host.send("from host")
        made.link.send("from client")
        await settle()
        expect(heard).toEqual(["from host"])
        expect(toHost).toEqual(["from client"])
    })

    test("a connection lost → faulted, reconnecting, then back on the same link with the same session", async() => {
        const first = opened()
        const second = opened()
        const { client: made, told, faults, datas } = client([
            () => Promise.resolve(first.client),
            () => Promise.resolve(second.client),
        ])
        await made.connect()
        await settle()
        const heard: string[] = []
        made.link.listen(message => heard.push(message))
        first.host.close()
        await settle()
        expect(faults[0]).toBeInstanceOf(ConnectionLostFault)
        expect(told).toEqual(["reconnecting", "reconnected"])
        expect(datas).toEqual([writeSession(made.session), writeSession(made.session)])
        await settle()
        second.host.send("welcome back")
        await settle()
        expect(heard).toEqual(["welcome back"])
    })

    test("what is sent while lost → dropped, not queued", async() => {
        const first = opened()
        const { client: made } = client([() => Promise.resolve(first.client)])
        await made.connect()
        await settle()
        first.host.close()
        await settle()
        expect(made.isConnected).toBe(false)
        expect(() => made.link.send("into the void")).not.toThrow()
    })

    test("tries failing → tried again, until it works", async() => {
        const first = opened()
        const third = opened()
        const { client: made, timer, told } = client([
            () => Promise.resolve(first.client),
            () => Promise.reject(new NetError("unreachable", "Down.")),
            () => Promise.resolve(third.client),
        ])
        await made.connect()
        await settle()
        first.host.close()
        await settle()
        expect(told).toEqual(["reconnecting"])
        timer.advance(1_000)
        await settle()
        expect(told).toEqual(["reconnecting", "reconnected"])
    })

    test("the grace over → ended with a SessionExpiredFault", async() => {
        const first = opened()
        const { client: made, timer, ended } = client([() => Promise.resolve(first.client)])
        await made.connect()
        await settle()
        first.host.close()
        await settle()
        for(let step = 0; step < 20 && ended.length === 0; step++){
            timer.advance(1_000)
            await settle()
        }
        expect(ended).toHaveLength(1)
        expect(ended[0]).toBeInstanceOf(SessionExpiredFault)
    })

    test("refused when coming back → ended with a SessionExpiredFault: the host knows no such session", async() => {
        const first = opened()
        const { client: made, ended } = client([
            () => Promise.resolve(first.client),
            () => Promise.reject(new NetError("refused", "No.")),
        ])
        await made.connect()
        await settle()
        first.host.close()
        await settle()
        expect(ended[0]).toBeInstanceOf(SessionExpiredFault)
    })

    test("closed on purpose → no try to come back", async() => {
        const first = opened()
        const { client: made, told } = client([() => Promise.resolve(first.client)])
        await made.connect()
        await settle()
        made.close()
        await settle()
        expect(told).toEqual([])
    })
})
