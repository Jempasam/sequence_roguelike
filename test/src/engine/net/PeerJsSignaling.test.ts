import { NetError, PTPClientSocket, PTPHostSocket, Room } from "@game/core"
import type { NetPort, Peer } from "@game/core"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { WebSocket as NodeWebSocket } from "ws"

import { nextMessage, nodeNet, once, signalingOf } from "../../fixtures/netServer"
import { REAL_TIMER, startPeerRelay } from "../../fixtures/peerServer"
import type { PeerRelay } from "../../fixtures/peerServer"

// --- Fixture builders ---

let relay: PeerRelay
const opened: { close(): void }[] = []

/** The address of the relay, with a `prefix` of its own and no STUN: the peers of a test reach each other. */
function address(prefix = "test"): string {
    return `${relay.url}?prefix=${prefix}&stun=`
}

type HostOptions = Partial<Parameters<typeof PTPHostSocket.open>[2]>

async function host(code: string, options: HostOptions = {}): Promise<PTPHostSocket> {
    const all = { name: "game", code, timer: REAL_TIMER, ...options }
    const socket = await PTPHostSocket.open(nodeNet(), signalingOf(address()), all)
    opened.push(socket)
    return socket
}

async function join(code: string, data: string): Promise<PTPClientSocket> {
    const socket = await PTPClientSocket.join(nodeNet(), signalingOf(address()), code, { data, timer: REAL_TIMER })
    opened.push(socket)
    return socket
}

interface RawClient {
    readonly socket: NodeWebSocket
    readonly heard: Record<string, unknown>[]
}

/** A raw client of the relay, to see what it tells. */
async function rawClient(id: string, token: string): Promise<RawClient> {
    const base = relay.url.replace("peerjs", "ws")
    const socket = new NodeWebSocket(`${base}/peerjs?key=peerjs&id=${id}&token=${token}`)
    const heard: Record<string, unknown>[] = []
    socket.on("message", data => heard.push(JSON.parse(data.toString()) as Record<string, unknown>))
    await new Promise(resolve => socket.once("open", resolve))
    opened.push({ close: () => socket.close() })
    return { socket, heard }
}

async function until(condition: () => boolean): Promise<void> {
    while(!condition()) await new Promise(resolve => setTimeout(resolve, 5))
}

beforeEach(async() => {
    // A short wait for a message to an id nobody holds, so a knock on an empty room is answered soon.
    relay = await startPeerRelay({ expire_timeout: 300 })
})

afterEach(async() => {
    for(const socket of opened.splice(0)) socket.close()
    await relay.close()
})

// --- Tests ---

describe("PeerJsSignaling relay", () => {
    test("same id, same token → takes the place; another token → ID-TAKEN", async() => {
        const first = await rawClient("ROOM-1", "secret")
        await until(() => first.heard.some(message => message.type === "OPEN"))
        // The same client coming back is let in without a word, and holds the id from then on.
        const same = await rawClient("ROOM-1", "secret")
        await new Promise(resolve => setTimeout(resolve, 100))
        expect(same.heard).toEqual([])
        const other = await rawClient("ROOM-1", "another secret")
        await until(() => other.heard.length > 0)
        expect(other.heard[0].type).toBe("ID-TAKEN")
    })

    test("a message to a client → arrives with its src and its payload, whatever its fields", async() => {
        const a = await rawClient("A", "a")
        const b = await rawClient("B", "b")
        await until(() => a.heard.length > 0 && b.heard.length > 0)
        const payload = { k: "knock", extra: { deep: [1, 2] } }
        a.socket.send(JSON.stringify({ type: "OFFER", dst: "B", payload }))
        await until(() => b.heard.length > 1)
        expect(b.heard[1]).toMatchObject({ type: "OFFER", src: "A", payload })
    })

    test("a message to an id nobody holds → its sender is told EXPIRE after a while", async() => {
        const a = await rawClient("A", "a")
        await until(() => a.heard.length > 0)
        a.socket.send(JSON.stringify({ type: "OFFER", dst: "NOBODY", payload: { k: "knock" } }))
        await until(() => a.heard.length > 1)
        expect(a.heard[1]).toMatchObject({ type: "EXPIRE", src: "NOBODY" })
    })
})

describe("PeerJsSignaling rooms", () => {
    test("mesh → refused at once, before any connection is made", async() => {
        let connections = 0
        const net: NetPort = {
            ...nodeNet(),
            openWebSocket: url => {
                connections++
                return new WebSocket(url)
            },
        }
        const creating = Room.create(net, signalingOf(address(), net), "mesh", { name: "game", timer: REAL_TIMER })
        await expect(creating).rejects.toThrow(/mesh/)
        expect(connections).toBe(0)
    })

    test("client joins → both connections open, the host knows the client's data", async() => {
        const hosting = await host("HUB-0")
        expect(hosting.code).toBe("HUB-0")
        const client = once<Peer>(handler => hosting.onClient(handler))
        const joined = await join("hub-0", "alice")
        expect(joined.state).toBe("open")
        expect((await client).member.data).toBe("alice")
        expect(joined.host.id).toBe(hosting.room.self.id)
    })

    test("messages → heard both ways", async() => {
        const hosting = await host("HUB-0")
        const client = once<Peer>(handler => hosting.onClient(handler))
        const joined = await join("HUB-0", "alice")
        const { connection } = await client
        const toHost = nextMessage(connection)
        joined.send("hello host")
        expect(await toHost).toBe("hello host")
        const toClient = nextMessage(joined)
        connection.send("hello client")
        expect(await toClient).toBe("hello client")
    })

    test("code taken → open fails with taken, and the room is still the first one's", async() => {
        const first = await host("HUB-0")
        await expect(host("HUB-0")).rejects.toMatchObject({ reason: "taken" })
        const joined = await join("HUB-0", "alice")
        expect(joined.host.id).toBe(first.room.self.id)
    })

    test("no code → a code made up, which a client finds", async() => {
        const hosting = await host(undefined as unknown as string)
        expect(hosting.code).toMatch(/^[A-Z2-9]{6}$/)
        await join(hosting.code, "alice")
    })

    test("empty room → join fails as unreachable, after the relay says nobody reads", async() => {
        await expect(join("HUB-9", "alice")).rejects.toMatchObject({ reason: "unreachable" })
    })

    test("refusing admission → join fails with refused", async() => {
        await host("HUB-0", { admit: member => member.data !== "mallory" })
        await expect(join("HUB-0", "mallory")).rejects.toMatchObject({ reason: "refused" })
    })

    test("full room → join fails with full", async() => {
        const hosting = await host("HUB-0", { capacity: 2 })
        await join(hosting.code, "first")
        await expect(join(hosting.code, "late")).rejects.toMatchObject({ reason: "full" })
    })

    test("client leaves → the host is told", async() => {
        const hosting = await host("HUB-0")
        const joined = await join("HUB-0", "alice")
        const left = once(handler => hosting.onLeave(handler))
        joined.close()
        expect(await left).toMatchObject({ data: "alice" })
    })

    test("host closes → the client's connection closes", async() => {
        const hosting = await host("HUB-0")
        const joined = await join("HUB-0", "alice")
        const closed = once(handler => joined.onClose(handler))
        hosting.close()
        const reason = await closed
        expect(reason).toBeInstanceOf(NetError)
        expect(joined.state).toBe("closed")
    })

    test("the code is free again once its host closed", async() => {
        const first = await host("HUB-0")
        first.close()
        // The relay forgets the id when it sees the socket close, which the host may see first.
        for(let attempt = 0; ; attempt++){
            try {
                await host("HUB-0")
                break
            } catch(error){
                if(attempt > 50 || !(error instanceof NetError) || error.reason !== "taken") throw error
                await new Promise(resolve => setTimeout(resolve, 20))
            }
        }
    })
})
