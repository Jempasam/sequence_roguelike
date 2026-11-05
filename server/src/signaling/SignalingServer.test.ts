import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { WebSocket } from "ws"

import { PROTOCOL_VERSION, readServerMessage, writeMessage } from "../protocol"
import type { ClientMessage, ServerMessage } from "../protocol"
import { TurnCredentials } from "../turn"
import { IceConfig } from "./IceConfig"
import { SignalingServer } from "./SignalingServer"

// --- Fixture builders ---

type Of<T extends ServerMessage["type"]> = Extract<ServerMessage, { type: T }>

/** A client of the signaling server that keeps what it hears, to be awaited in order. */
class Client {


    public readonly socket: WebSocket
    public readonly closed: Promise<number>


    constructor(port: number){
        this.socket = new WebSocket(`ws://localhost:${port}`)
        this.socket.on("message", data => this.#hear(readServerMessage(data.toString())))
        this.closed = new Promise(resolve => this.socket.on("close", code => resolve(code)))
    }


    public async send(message: ClientMessage): Promise<void> {
        if(this.socket.readyState !== WebSocket.OPEN) await new Promise(resolve => this.socket.once("open", resolve))
        this.socket.send(writeMessage(message))
    }

    /** The next message heard, which must be of this type. */
    public async next<T extends ServerMessage["type"]>(type: T): Promise<Of<T>> {
        const message = this.#heard.shift()
            ?? await new Promise<ServerMessage>(resolve => this.#waiting.push(resolve))
        expect(message.type).toBe(type)
        return message as Of<T>
    }

    /** Have all messages been awaited? */
    public get isQuiet(): boolean { return this.#heard.length === 0 }


    readonly #heard: ServerMessage[] = []
    readonly #waiting: ((message: ServerMessage) => void)[] = []

    #hear(message: ServerMessage): void {
        const waiting = this.#waiting.shift()
        if(waiting) waiting(message)
        else this.#heard.push(message)
    }
}

let server: SignalingServer
let port: number
const clients: Client[] = []

async function greeted(): Promise<Client> {
    const client = new Client(port)
    clients.push(client)
    await client.send({ type: "hello", version: PROTOCOL_VERSION })
    await client.next("welcome")
    return client
}

async function host(shape: "star"|"mesh", capacity = 8): Promise<{ client: Client, code: string, id: string }> {
    const client = await greeted()
    await client.send({ type: "create", shape, name: "room", data: { name: "owner" }, capacity })
    const entered = await client.next("entered")
    return { client, code: entered.code, id: entered.self.id }
}

/** A client let into a room by its owner. */
async function enter(code: string, owner: Client, data: string): Promise<{ client: Client, entered: Of<"entered"> }> {
    const client = await greeted()
    await client.send({ type: "join", code, data })
    const knock = await owner.next("knocking")
    await owner.send({ type: "admit", member: knock.member.id, accepted: true })
    return { client, entered: await client.next("entered") }
}

beforeEach(async() => {
    const credentials = new TurnCredentials("a secret for the tests only")
    server = new SignalingServer({ port: 0, ice: new IceConfig({ publicHost: "localhost", port: 3478, credentials }) })
    port = await server.listening
})

afterEach(async() => {
    for(const client of clients.splice(0)) client.socket.close()
    await server.close()
})

// --- Tests ---

describe("SignalingServer hello", () => {
    test("right version → welcome with STUN and TURN", async() => {
        const client = new Client(port)
        clients.push(client)
        await client.send({ type: "hello", version: PROTOCOL_VERSION })
        const welcome = await client.next("welcome")
        expect(welcome.iceServers[0].urls).toEqual(["stun:localhost:3478"])
        expect(welcome.iceServers[1].username).toMatch(/^\d+-[a-z0-9]+$/)
    })

    test("other version → error and closed", async() => {
        const client = new Client(port)
        clients.push(client)
        await client.send({ type: "hello", version: PROTOCOL_VERSION + 1 })
        await client.next("error")
        expect(await client.closed).toBe(1002)
    })

    test("message before hello → closed", async() => {
        const client = new Client(port)
        clients.push(client)
        await client.send({ type: "setData", data: null })
        await client.next("error")
        expect(await client.closed).toBe(1002)
    })
})

describe("SignalingServer rooms", () => {
    test("create → entered alone, as owner, under a 6-letter code", async() => {
        const client = await greeted()
        await client.send({ type: "create", shape: "star", name: "game", data: 1, capacity: 4 })
        const entered = await client.next("entered")
        expect(entered.code).toMatch(/^[A-Z2-9]{6}$/)
        expect(entered.owner).toBe(entered.self.id)
        expect(entered.members).toEqual([])
    })

    test("unknown code → refused not-found", async() => {
        const client = await greeted()
        await client.send({ type: "join", code: "NOPE22", data: null })
        expect((await client.next("refused")).reason).toBe("not-found")
    })

    test("owner refuses → refused, the client may join elsewhere", async() => {
        const room = await host("star")
        const client = await greeted()
        await client.send({ type: "join", code: room.code, data: null })
        const knock = await room.client.next("knocking")
        await room.client.send({ type: "admit", member: knock.member.id, accepted: false })
        expect((await client.next("refused")).reason).toBe("refused")
        const other = await host("star")
        await client.send({ type: "join", code: other.code, data: null })
        await other.client.next("knocking")
    })

    test("full room → refused full", async() => {
        const room = await host("star", 2)
        await enter(room.code, room.client, "first")
        const late = await greeted()
        await late.send({ type: "join", code: room.code, data: null })
        expect((await late.next("refused")).reason).toBe("full")
    })

    test("star → each member knows the host only", async() => {
        const room = await host("star")
        const a = await enter(room.code, room.client, "a")
        expect(a.entered.members.map(member => member.id)).toEqual([room.id])
        expect((await room.client.next("joined")).member.data).toBe("a")
        const b = await enter(room.code, room.client, "b")
        expect(b.entered.members.map(member => member.id)).toEqual([room.id])
        await room.client.next("joined")
        expect(a.client.isQuiet).toBe(true)
    })

    test("mesh → each newcomer knows every member, each member hears of it", async() => {
        const room = await host("mesh")
        const a = await enter(room.code, room.client, "a")
        await room.client.next("joined")
        const b = await enter(room.code, room.client, "b")
        expect(b.entered.members.map(member => member.data)).toEqual([{ name: "owner" }, "a"])
        expect((await a.client.next("joined")).member.data).toBe("b")
        expect((await room.client.next("joined")).member.data).toBe("b")
    })

    test("setData → changed for the linked members", async() => {
        const room = await host("mesh")
        const a = await enter(room.code, room.client, "a")
        await room.client.next("joined")
        await a.client.send({ type: "setData", data: "ready" })
        expect((await room.client.next("changed")).member).toEqual({ id: a.entered.self.id, data: "ready" })
    })
})

describe("SignalingServer leaving", () => {
    test("star host leaves → closed for every member", async() => {
        const room = await host("star")
        const a = await enter(room.code, room.client, "a")
        room.client.socket.close()
        await a.client.next("closed")
        expect(server.rooms).toBe(0)
    })

    test("star member leaves → left for the host", async() => {
        const room = await host("star")
        const a = await enter(room.code, room.client, "a")
        await room.client.next("joined")
        a.client.socket.close()
        expect((await room.client.next("left")).member).toBe(a.entered.self.id)
    })

    test("mesh owner leaves → left, then the oldest member owns the room and hears the knocks", async() => {
        const room = await host("mesh")
        const a = await enter(room.code, room.client, "a")
        await room.client.next("joined")
        const b = await enter(room.code, room.client, "b")
        await room.client.next("joined")
        await a.client.next("joined")
        const waiting = await greeted()
        await waiting.send({ type: "join", code: room.code, data: "c" })
        await room.client.next("knocking")
        room.client.socket.close()
        await a.client.next("left")
        expect((await a.client.next("owner")).member).toBe(a.entered.self.id)
        expect((await a.client.next("knocking")).member.data).toBe("c")
        await b.client.next("left")
        expect((await b.client.next("owner")).member).toBe(a.entered.self.id)
    })
})

describe("SignalingServer signal", () => {
    test("between linked members → passed with its sender", async() => {
        const room = await host("star")
        const a = await enter(room.code, room.client, "a")
        await room.client.next("joined")
        await a.client.send({ type: "signal", to: room.id, signal: { kind: "description", type: "offer", sdp: "v=0" } })
        const signal = await room.client.next("signal")
        expect(signal.from).toBe(a.entered.self.id)
        expect(signal.signal).toEqual({ kind: "description", type: "offer", sdp: "v=0" })
    })

    test("between two star members → error and closed", async() => {
        const room = await host("star")
        const a = await enter(room.code, room.client, "a")
        await room.client.next("joined")
        const b = await enter(room.code, room.client, "b")
        await a.client.send({
            type: "signal", to: b.entered.self.id, signal: { kind: "description", type: "offer", sdp: "v=0" },
        })
        await a.client.next("error")
        expect(await a.client.closed).toBe(1002)
    })
})
