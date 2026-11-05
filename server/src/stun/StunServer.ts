import { createSocket } from "node:dgram"
import type { Socket as UdpSocket } from "node:dgram"
import { createServer as createTcpServer } from "node:net"
import type { Server as TcpServer, Socket as TcpSocket } from "node:net"
import { createServer as createTlsServer } from "node:tls"

import {
    isComprehensionRequired, STUN_ATTRIBUTE, STUN_ERROR, STUN_METHOD, UNDERSTOOD_ATTRIBUTES, writeErrorCode,
} from "./StunAttribute"
import { HEADER_LENGTH, padding, StunError, StunMessage } from "./StunMessage"
import { transportAddress, writeXorAddress } from "./TransportAddress"
import type { TransportAddress } from "./TransportAddress"

/** The name the server gives itself in the SOFTWARE attribute of its answers. */
export const SOFTWARE = "roguelike-stun"

/** The most bytes a TCP connection may buffer before a whole message comes, past which it is cut off. */
const MAX_STREAM_BUFFER = 64 * 1024

/** How a client reached the server. */
export type StunProtocol = "udp"|"tcp"|"tls"

/**
 * The way back to one client: its address, the address it reached, and how to send it bytes. Its key names
 * the 5-tuple, so a TURN allocation is found again from the next message.
 */
export interface StunTransport {
    readonly protocol: StunProtocol
    readonly client: TransportAddress
    readonly key: string
    send(bytes: Uint8Array): void
}

/** What the STUN server hands what it does not answer itself: every message but a Binding request. */
export interface StunHandler {
    /** Handle a STUN message, already checked for unknown attributes and its FINGERPRINT. */
    message(message: StunMessage, from: StunTransport): void

    /** Handle channel data, which a TURN client sends to a peer through a channel. */
    channelData(channel: number, data: Uint8Array, from: StunTransport): void

    /** Forget a client whose TCP or TLS connection closed. */
    closed(from: StunTransport): void
}

/** What the STUN server listens on. */
export interface StunServerOptions {
    /** The port, over both UDP and TCP, 0 for any free one. */
    readonly port: number

    /** The port of TLS, and its certificate and key in PEM, none to serve no TLS. */
    readonly tls?: { readonly port: number, readonly cert: string, readonly key: string }

    /** What handles the messages other than a Binding request, none to answer Binding only. */
    readonly handler?: StunHandler
}

/**
 * A STUN server (RFC 8489) over UDP, TCP and TLS. It answers Binding requests with the address it sees
 * the client at, and hands every other message to its handler, the TURN server.
 */
export class StunServer {


    /** The ports listened on, UDP and TCP first, then TLS when served, once they all listen. */
    public readonly listening: Promise<{ readonly port: number, readonly tlsPort: number|null }>


    constructor(
        public readonly options: StunServerOptions,
    ){
        // IPv4 only, as the relay: a client of IPv6 would learn an address it cannot relay to.
        this.#udp = createSocket("udp4")
        // Once bound, a failing socket is reported rather than left to crash the whole server.
        this.#udp.on("error", error => console.error(`STUN over UDP failed: ${error.message}`))
        this.#udp.on("message", (bytes, from) => {
            const transport = this.#udpTransport(transportAddress(from.address, from.port))
            this.#hear(new Uint8Array(bytes), transport)
        })
        const tls = options.tls
        this.#tcp = createTcpServer(socket => this.#stream(socket, "tcp"))
        this.#tls = tls ? createTlsServer({ cert: tls.cert, key: tls.key }, socket => this.#stream(socket, "tls")) : null
        this.listening = this.#listen()
    }


    public async close(): Promise<void> {
        for(const socket of this.#streams) socket.destroy()
        await Promise.all([
            new Promise<void>(resolve => this.#udp.close(() => resolve())),
            closeServer(this.#tcp),
            this.#tls ? closeServer(this.#tls) : null,
        ])
    }


    readonly #udp: UdpSocket
    readonly #tcp: TcpServer
    readonly #tls: TcpServer|null
    readonly #streams = new Set<TcpSocket>()

    async #listen(): Promise<{ port: number, tlsPort: number|null }> {
        const udpPort = await new Promise<number>((resolve, reject) => {
            this.#udp.once("error", reject)
            this.#udp.bind(this.options.port, () => resolve(this.#udp.address().port))
        })
        // TCP takes the port UDP got, so a port of 0 still serves both on one number.
        await listen(this.#tcp, udpPort)
        const tls = this.options.tls
        const tlsPort = this.#tls && tls ? await listen(this.#tls, tls.port) : null
        console.log(`STUN listening on ${udpPort} (UDP, TCP)${tlsPort === null ? "" : ` and ${tlsPort} (TLS)`}`)
        return { port: udpPort, tlsPort }
    }

    #udpTransport(client: TransportAddress): StunTransport {
        return {
            protocol: "udp",
            client,
            key: `udp|${client.address}|${client.port}`,
            send: bytes => this.#udp.send(bytes, client.port, client.address),
        }
    }

    #stream(socket: TcpSocket, protocol: "tcp"|"tls"): void {
        const address = socket.remoteAddress
        const port = socket.remotePort
        if(address === undefined || port === undefined){
            socket.destroy()
            return
        }
        this.#streams.add(socket)
        const client = transportAddress(address, port)
        const transport: StunTransport = {
            protocol,
            client,
            key: `${protocol}|${client.address}|${client.port}`,
            send: bytes => {
                if(socket.writable) socket.write(bytes)
            },
        }
        let buffer: Uint8Array = new Uint8Array(0)
        socket.on("data", chunk => {
            buffer = concat(buffer, chunk)
            buffer = this.#frames(buffer, transport, socket)
        })
        socket.on("error", () => socket.destroy())
        socket.on("close", () => {
            this.#streams.delete(socket)
            this.options.handler?.closed(transport)
        })
    }

    /**
     * Hear every whole message at the start of a stream's buffer, and keep what is left. Over a stream, a
     * STUN message is framed by its header and channel data by its own, padded to four bytes.
     */
    #frames(buffer: Uint8Array, transport: StunTransport, socket: TcpSocket): Uint8Array {
        let rest: Uint8Array = buffer
        while(rest.length >= 4){
            const view = new DataView(rest.buffer, rest.byteOffset, rest.byteLength)
            const length = view.getUint16(2)
            const isChannelData = (rest[0] & 0xc0) === 0x40
            const isStun = (rest[0] & 0xc0) === 0x00
            if(!isChannelData && !isStun){
                socket.destroy()
                return new Uint8Array(0)
            }
            const size = isStun ? HEADER_LENGTH + length : 4 + length + padding(length)
            if(rest.length < size) break
            this.#hear(rest.subarray(0, isStun ? size : 4 + length), transport)
            rest = rest.subarray(size)
        }
        if(rest.length > MAX_STREAM_BUFFER) socket.destroy()
        return rest.slice()
    }

    #hear(bytes: Uint8Array, transport: StunTransport): void {
        const handler = this.options.handler
        if((bytes[0] & 0xc0) === 0x40){
            if(bytes.length < 4) return
            const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
            const length = view.getUint16(2)
            if(4 + length > bytes.length) return
            handler?.channelData(view.getUint16(0), bytes.slice(4, 4 + length), transport)
            return
        }
        let message: StunMessage
        try {
            message = StunMessage.read(bytes)
        } catch(error){
            // Anything may reach a public UDP port: what is no STUN is dropped, as RFC 8489 asks.
            if(error instanceof StunError) return
            throw error
        }
        if(!message.isFingerprintValid()) return
        if(message.kind === "request" && this.#refusedUnknown(message, transport)) return
        if(message.method === STUN_METHOD.BINDING && message.kind === "request") this.#bind(message, transport)
        else handler?.message(message, transport)
    }

    /** Answer a request that carries attributes the server must understand and does not, with a 420. */
    #refusedUnknown(message: StunMessage, transport: StunTransport): boolean {
        const unknown = message.attributes
            .map(attribute => attribute.type)
            .filter(type => isComprehensionRequired(type) && !UNDERSTOOD_ATTRIBUTES.has(type))
        if(unknown.length === 0) return false
        const list = new Uint8Array(unknown.length * 2)
        unknown.forEach((type, i) => new DataView(list.buffer).setUint16(i * 2, type))
        transport.send(message.answer("error", [
            { type: STUN_ATTRIBUTE.ERROR_CODE, value: writeErrorCode(STUN_ERROR.UNKNOWN_ATTRIBUTE) },
            { type: STUN_ATTRIBUTE.UNKNOWN_ATTRIBUTES, value: list },
        ]).write({ fingerprint: true }))
        return true
    }

    #bind(request: StunMessage, transport: StunTransport): void {
        transport.send(request.answer("success", [
            {
                type: STUN_ATTRIBUTE.XOR_MAPPED_ADDRESS,
                value: writeXorAddress(transport.client, request.transactionId),
            },
            { type: STUN_ATTRIBUTE.SOFTWARE, value: new TextEncoder().encode(SOFTWARE) },
        ]).write({ fingerprint: true }))
    }
}

function listen(server: TcpServer, port: number): Promise<number> {
    return new Promise((resolve, reject) => {
        server.once("error", reject)
        server.listen(port, () => {
            const address = server.address()
            if(typeof address === "object" && address !== null) resolve(address.port)
            else reject(new Error("A STUN listener listens without a port."))
        })
    })
}

function closeServer(server: TcpServer): Promise<void> {
    return new Promise(resolve => server.close(() => resolve()))
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
    if(a.length === 0) return new Uint8Array(b)
    const bytes = new Uint8Array(a.length + b.length)
    bytes.set(a)
    bytes.set(b, a.length)
    return bytes
}
