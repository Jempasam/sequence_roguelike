import { createSocket } from "node:dgram"
import type { Socket } from "node:dgram"
import { afterEach, describe, expect, test } from "vitest"

import {
    longTermKey, readErrorCode, readUint32, readXorAddress, STUN_ATTRIBUTE, STUN_METHOD, StunMessage,
    StunServer, writeUint32, writeXorAddress,
} from "../stun"
import type { StunAttributeValue, TransportAddress } from "../stun"
import { TurnCredentials } from "./Credentials"
import { RelayPolicy } from "./RelayPolicy"
import { TurnServer } from "./TurnServer"

// --- Fixture builders ---

const REALM = "test.realm"
const CREDENTIALS = new TurnCredentials("a secret for the tests only")
const { username: USERNAME, credential: PASSWORD } = CREDENTIALS.issue("tester")
const KEY = longTermKey(USERNAME, REALM, PASSWORD)

/** How long a test waits for a datagram that should come, in milliseconds. */
const PATIENCE = 2000

const opened: { close(): unknown }[] = []

async function socket(): Promise<Socket> {
    const udp = createSocket("udp4")
    await new Promise<void>(resolve => udp.bind(0, "127.0.0.1", resolve))
    opened.push(udp)
    return udp
}

function next(udp: Socket): Promise<{ bytes: Uint8Array, from: TransportAddress }> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("No datagram came.")), PATIENCE)
        udp.once("message", (bytes, from) => {
            clearTimeout(timer)
            const address: TransportAddress = { family: 4, address: from.address, port: from.port }
            resolve({ bytes: new Uint8Array(bytes), from: address })
        })
    })
}

async function serve(policy = new RelayPolicy({ allowPrivatePeers: true })) {
    const turn = new TurnServer({ realm: REALM, credentials: CREDENTIALS, relayAddress: "127.0.0.1", policy })
    const stun = new StunServer({ port: 0, handler: turn })
    opened.push({ close: () => turn.close() }, stun)
    const { port } = await stun.listening
    return { turn, port }
}

/** A TURN client over UDP, which authenticates every request it sends. */
async function client(port: number) {
    const udp = await socket()
    let nonce = ""
    const send = (bytes: Uint8Array): void => {
        udp.send(bytes, port, "127.0.0.1")
    }
    const ask = async(message: StunMessage): Promise<StunMessage> => {
        send(message.write())
        return StunMessage.read((await next(udp)).bytes)
    }
    /** Ask with credentials, learning the nonce from the first challenge. */
    const request = async(method: number, attributes: StunAttributeValue[], password = PASSWORD) => {
        const sealed = (): StunMessage => new StunMessage(method, "request", undefined, [
            ...attributes,
            { type: STUN_ATTRIBUTE.USERNAME, value: text(USERNAME) },
            { type: STUN_ATTRIBUTE.REALM, value: text(REALM) },
            { type: STUN_ATTRIBUTE.NONCE, value: text(nonce) },
        ])
        const key = longTermKey(USERNAME, REALM, password)
        const once = async(): Promise<StunMessage> => {
            const message = sealed()
            send(message.write({ key }))
            return StunMessage.read((await next(udp)).bytes)
        }
        let answer = await once()
        if(answer.kind === "error" && readErrorCode(answer.attribute(STUN_ATTRIBUTE.ERROR_CODE)!) === 438){
            nonce = answer.text(STUN_ATTRIBUTE.NONCE)!
            answer = await once()
        }
        return answer
    }
    const challenge = await ask(new StunMessage(STUN_METHOD.ALLOCATE, "request", undefined, [udpTransport()]))
    nonce = challenge.text(STUN_ATTRIBUTE.NONCE) ?? ""
    return { udp, send, ask, request, challenge }
}

function text(value: string): Uint8Array {
    return new TextEncoder().encode(value)
}

function udpTransport(): StunAttributeValue {
    return { type: STUN_ATTRIBUTE.REQUESTED_TRANSPORT, value: Uint8Array.of(17, 0, 0, 0) }
}

function errorOf(message: StunMessage): number|null {
    const value = message.attribute(STUN_ATTRIBUTE.ERROR_CODE)
    return value ? readErrorCode(value) : null
}

function relayedOf(message: StunMessage): TransportAddress {
    return readXorAddress(message.attribute(STUN_ATTRIBUTE.XOR_RELAYED_ADDRESS)!, message.transactionId)!
}

// An IPv4 address is masked with the magic cookie only, so the transaction id it goes with does not matter.
function peerAttribute(peer: TransportAddress): StunAttributeValue {
    return { type: STUN_ATTRIBUTE.XOR_PEER_ADDRESS, value: writeXorAddress(peer, new Uint8Array(12)) }
}

afterEach(() => {
    for(const item of opened.splice(0).reverse()) item.close()
})

// --- Tests ---

describe("TurnServer authentication", () => {
    test("Binding → the address the client is seen at", async() => {
        const { port } = await serve()
        const udp = await socket()
        const request = new StunMessage(STUN_METHOD.BINDING, "request")
        udp.send(request.write(), port, "127.0.0.1")
        const answer = StunMessage.read((await next(udp)).bytes)
        const value = answer.attribute(STUN_ATTRIBUTE.XOR_MAPPED_ADDRESS)!
        const mapped = readXorAddress(value, answer.transactionId)
        expect(mapped).toEqual({ family: 4, address: "127.0.0.1", port: udp.address().port })
    })

    test("Allocate without credentials → 401 with a realm and a nonce", async() => {
        const { port } = await serve()
        const { challenge } = await client(port)
        expect(errorOf(challenge)).toBe(401)
        expect(challenge.text(STUN_ATTRIBUTE.REALM)).toBe(REALM)
        expect(challenge.text(STUN_ATTRIBUTE.NONCE)).not.toBeNull()
    })

    test("Allocate with a wrong password → 401", async() => {
        const { port } = await serve()
        const { request } = await client(port)
        expect(errorOf(await request(STUN_METHOD.ALLOCATE, [udpTransport()], "wrong"))).toBe(401)
    })

    test("Allocate with credentials → relayed address, lifetime, answer sealed", async() => {
        const { port, turn } = await serve()
        const { request } = await client(port)
        const answer = await request(STUN_METHOD.ALLOCATE, [udpTransport()])
        expect(answer.kind).toBe("success")
        expect(answer.isSealedWith(KEY)).toBe(true)
        expect(relayedOf(answer).address).toBe("127.0.0.1")
        expect(readUint32(answer.attribute(STUN_ATTRIBUTE.LIFETIME)!)).toBe(600)
        expect(turn.allocations).toBe(1)
    })

    test("Allocate repeated under the same transaction id → the same answer", async() => {
        const { port } = await serve()
        const { udp, send, challenge } = await client(port)
        const message = new StunMessage(STUN_METHOD.ALLOCATE, "request", undefined, [
            udpTransport(),
            { type: STUN_ATTRIBUTE.USERNAME, value: text(USERNAME) },
            { type: STUN_ATTRIBUTE.REALM, value: text(REALM) },
            { type: STUN_ATTRIBUTE.NONCE, value: text(challenge.text(STUN_ATTRIBUTE.NONCE)!) },
        ])
        send(message.write({ key: KEY }))
        const first = (await next(udp)).bytes
        send(message.write({ key: KEY }))
        expect((await next(udp)).bytes).toEqual(first)
    })

    test("Allocate without REQUESTED-TRANSPORT → 400", async() => {
        const { port } = await serve()
        const { request } = await client(port)
        expect(errorOf(await request(STUN_METHOD.ALLOCATE, []))).toBe(400)
    })

    test("Refresh before Allocate → 437", async() => {
        const { port } = await serve()
        const { request } = await client(port)
        expect(errorOf(await request(STUN_METHOD.REFRESH, []))).toBe(437)
    })

    test("Refresh with a lifetime of 0 → allocation deleted", async() => {
        const { port, turn } = await serve()
        const { request } = await client(port)
        await request(STUN_METHOD.ALLOCATE, [udpTransport()])
        const lifetime = { type: STUN_ATTRIBUTE.LIFETIME, value: writeUint32(0) }
        const answer = await request(STUN_METHOD.REFRESH, [lifetime])
        expect(answer.kind).toBe("success")
        expect(turn.allocations).toBe(0)
    })

    test("more allocations than the quota → 486", async() => {
        const { port } = await serve(new RelayPolicy({ allowPrivatePeers: true, maxAllocations: 1 }))
        await (await client(port)).request(STUN_METHOD.ALLOCATE, [udpTransport()])
        const second = await client(port)
        expect(errorOf(await second.request(STUN_METHOD.ALLOCATE, [udpTransport()]))).toBe(486)
    })
})

describe("TurnServer relaying", () => {
    test("permission, Send indication → the peer hears the client from the relayed address", async() => {
        const { port } = await serve()
        const turn = await client(port)
        const relayed = relayedOf(await turn.request(STUN_METHOD.ALLOCATE, [udpTransport()]))
        const peer = await socket()
        const peerAddress: TransportAddress = { family: 4, address: "127.0.0.1", port: peer.address().port }
        expect((await turn.request(STUN_METHOD.CREATE_PERMISSION, [peerAttribute(peerAddress)])).kind).toBe("success")
        turn.send(new StunMessage(STUN_METHOD.SEND, "indication", undefined, [
            peerAttribute(peerAddress),
            { type: STUN_ATTRIBUTE.DATA, value: text("hello peer") },
        ]).write())
        const heard = await next(peer)
        expect(new TextDecoder().decode(heard.bytes)).toBe("hello peer")
        expect(heard.from.port).toBe(relayed.port)
        peer.send(text("hello client"), relayed.port, "127.0.0.1")
        const data = StunMessage.read((await next(turn.udp)).bytes)
        expect(data.method).toBe(STUN_METHOD.DATA)
        expect(new TextDecoder().decode(data.attribute(STUN_ATTRIBUTE.DATA)!)).toBe("hello client")
        const from = data.attribute(STUN_ATTRIBUTE.XOR_PEER_ADDRESS)!
        expect(readXorAddress(from, data.transactionId)).toEqual(peerAddress)
    })

    test("ChannelBind → channel data both ways", async() => {
        const { port } = await serve()
        const turn = await client(port)
        const relayed = relayedOf(await turn.request(STUN_METHOD.ALLOCATE, [udpTransport()]))
        const peer = await socket()
        const peerAddress: TransportAddress = { family: 4, address: "127.0.0.1", port: peer.address().port }
        const bind = [
            { type: STUN_ATTRIBUTE.CHANNEL_NUMBER, value: Uint8Array.of(0x40, 0x01, 0, 0) },
            peerAttribute(peerAddress),
        ]
        expect((await turn.request(STUN_METHOD.CHANNEL_BIND, bind)).kind).toBe("success")
        turn.send(Uint8Array.of(0x40, 0x01, 0, 3, 1, 2, 3))
        expect((await next(peer)).bytes).toEqual(Uint8Array.of(1, 2, 3))
        peer.send(Uint8Array.of(9, 8), relayed.port, "127.0.0.1")
        expect((await next(turn.udp)).bytes).toEqual(Uint8Array.of(0x40, 0x01, 0, 2, 9, 8))
    })

    test("ChannelBind out of range → 400", async() => {
        const { port } = await serve()
        const turn = await client(port)
        await turn.request(STUN_METHOD.ALLOCATE, [udpTransport()])
        const peerAddress: TransportAddress = { family: 4, address: "127.0.0.1", port: 9 }
        const bind = [
            { type: STUN_ATTRIBUTE.CHANNEL_NUMBER, value: Uint8Array.of(0x10, 0x00, 0, 0) },
            peerAttribute(peerAddress),
        ]
        expect(errorOf(await turn.request(STUN_METHOD.CHANNEL_BIND, bind))).toBe(400)
    })

    test("private peer under the default policy → 403", async() => {
        const { port } = await serve(new RelayPolicy())
        const turn = await client(port)
        await turn.request(STUN_METHOD.ALLOCATE, [udpTransport()])
        const peerAddress: TransportAddress = { family: 4, address: "127.0.0.1", port: 9 }
        const answer = await turn.request(STUN_METHOD.CREATE_PERMISSION, [peerAttribute(peerAddress)])
        expect(errorOf(answer)).toBe(403)
    })
})
