import { NetError, PTPClientSocket, PTPHostSocket } from "@game/core"
import type { Peer } from "@game/core"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { nextMessage, nextOnChannel, nodeNet, once, startNetServer } from "../../fixtures/netServer"
import type { NetServer } from "../../fixtures/netServer"

// --- Fixture builders ---

let server: NetServer
const opened: { close(): void }[] = []

async function host(options: Parameters<typeof PTPHostSocket.open>[2] = { name: "game" }): Promise<PTPHostSocket> {
    const socket = await PTPHostSocket.open(nodeNet(), server.url, options)
    opened.push(socket)
    return socket
}

async function join(code: string, data: string, relayOnly = false): Promise<PTPClientSocket> {
    const socket = await PTPClientSocket.join(nodeNet(relayOnly), server.url, code, { data })
    opened.push(socket)
    return socket
}

beforeEach(async() => {
    server = await startNetServer()
})

afterEach(async() => {
    for(const socket of opened.splice(0)) socket.close()
    await server.close()
})

// --- Tests ---

describe("PTPHostSocket", () => {
    test("client joins → both connections open, the host knows the client's data", async() => {
        const hosting = await host()
        const client = once<Peer>(handler => hosting.onClient(handler))
        const joined = await join(hosting.code, "alice")
        expect(joined.state).toBe("open")
        expect((await client).member.data).toBe("alice")
        expect(joined.host.id).toBe(hosting.room.self.id)
    })

    test("messages → heard both ways, on both channels", async() => {
        const hosting = await host()
        const client = once<Peer>(handler => hosting.onClient(handler))
        const joined = await join(hosting.code, "alice")
        const { connection } = await client
        const toHost = nextMessage(connection)
        joined.send("hello host")
        expect(await toHost).toBe("hello host")
        const toClient = nextOnChannel(joined)
        connection.send("hello client", "unreliable")
        expect(await toClient).toEqual(["hello client", "unreliable"])
    })

    test("broadcast → every client hears it", async() => {
        const hosting = await host()
        const a = await join(hosting.code, "a")
        const b = await join(hosting.code, "b")
        while(hosting.clients.filter(peer => peer.connection.state === "open").length < 2){
            await once(handler => hosting.onClient(handler))
        }
        const heard = Promise.all([nextMessage(a), nextMessage(b)])
        hosting.broadcast("round 1")
        expect(await heard).toEqual(["round 1", "round 1"])
    })

    test("refusing admission → join fails with refused", async() => {
        const hosting = await host({ name: "game", admit: member => member.data !== "mallory" })
        await expect(join(hosting.code, "mallory")).rejects.toMatchObject({ reason: "refused" })
    })

    test("unknown code → join fails with not-found", async() => {
        await expect(join("NOPE22", "alice")).rejects.toBeInstanceOf(NetError)
    })

    test("client leaves → the host is told", async() => {
        const hosting = await host()
        const joined = await join(hosting.code, "alice")
        const left = once(handler => hosting.onLeave(handler))
        joined.close()
        expect(await left).toMatchObject({ data: "alice" })
    })

    test("host closes → the client's connection closes", async() => {
        const hosting = await host()
        const joined = await join(hosting.code, "alice")
        const closed = once(handler => joined.onClose(handler))
        hosting.close()
        await closed
        expect(joined.state).toBe("closed")
    })

    test("relayed through TURN only → messages still pass", async() => {
        const hosting = await host()
        const client = once<Peer>(handler => hosting.onClient(handler))
        const joined = await join(hosting.code, "far away", true)
        const { connection } = await client
        const heard = nextMessage(connection)
        joined.send("through the relay")
        expect(await heard).toBe("through the relay")
        expect(server.turn.allocations).toBeGreaterThan(0)
    })
})
