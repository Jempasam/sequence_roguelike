import { PTPHostSocket, PTPSymSocket } from "@game/core"
import type { Peer } from "@game/core"
import type { Member } from "@game/server/protocol"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { nextMessage, nodeNet, once, startNetServer } from "../../fixtures/netServer"
import type { NetServer } from "../../fixtures/netServer"

// --- Fixture builders ---

let server: NetServer
const opened: { close(): void }[] = []

async function create(data: string): Promise<PTPSymSocket> {
    const socket = await PTPSymSocket.create(nodeNet(), server.url, { name: "lobby", data })
    opened.push(socket)
    return socket
}

async function join(code: string, data: string): Promise<PTPSymSocket> {
    const socket = await PTPSymSocket.join(nodeNet(), server.url, code, { data })
    opened.push(socket)
    return socket
}

/** Wait until every one of these members has an open connection to each of the others. */
async function meshed(sockets: readonly PTPSymSocket[]): Promise<void> {
    await Promise.all(sockets.map(async socket => {
        while(socket.peers.filter(peer => peer.connection.state === "open").length < sockets.length - 1){
            await once<Peer>(handler => socket.onPeer(handler))
        }
    }))
}

beforeEach(async() => {
    server = await startNetServer()
})

afterEach(async() => {
    for(const socket of opened.splice(0)) socket.close()
    await server.close()
})

// --- Tests ---

describe("PTPSymSocket", () => {
    test("three members → each linked to the two others, knowing their data", async() => {
        const a = await create("a")
        const b = await join(a.code, "b")
        const c = await join(a.code, "c")
        await meshed([a, b, c])
        const dataOf = (socket: PTPSymSocket) => socket.peers.map(peer => peer.member.data).sort()
        expect(dataOf(a)).toEqual(["b", "c"])
        expect(dataOf(b)).toEqual(["a", "c"])
        expect(dataOf(c)).toEqual(["a", "b"])
    })

    test("broadcast → every other member hears it, directly", async() => {
        const a = await create("a")
        const b = await join(a.code, "b")
        const c = await join(a.code, "c")
        await meshed([a, b, c])
        const heard = Promise.all([a, b].map(socket => nextMessage(socket.peers.find(peer => peer.member.data === "c")!.connection)))
        c.broadcast("from c")
        expect(await heard).toEqual(["from c", "from c"])
    })

    test("setData → the others are told", async() => {
        const a = await create("a")
        const b = await join(a.code, "b")
        await meshed([a, b])
        const changed = once<Member>(handler => a.onChange(handler))
        b.setData({ ready: true })
        expect((await changed).data).toEqual({ ready: true })
        expect(a.peers[0].member.data).toEqual({ ready: true })
    })

    test("owner leaves → the others stay linked, and the oldest admits newcomers", async() => {
        const a = await create("a")
        const b = await join(a.code, "b")
        const c = await join(a.code, "c")
        await meshed([a, b, c])
        const left = once<Member>(handler => c.onLeave(handler))
        a.close()
        expect((await left).data).toBe("a")
        const d = await join(b.code, "d")
        await meshed([b, c, d])
        expect(b.room.isOwner).toBe(true)
    })

    test("joining a star → refused, a symmetric socket is for a mesh", async() => {
        const host = await PTPHostSocket.open(nodeNet(), server.url, { name: "game" })
        opened.push(host)
        await expect(join(host.code, "b")).rejects.toThrow(/mesh/)
    })
})
