import { createHmac, randomBytes } from "node:crypto"
import { createSocket } from "node:dgram"
import type { Socket as UdpSocket } from "node:dgram"

import {
    longTermKey, readUint32, readXorAddress, SOFTWARE, STUN_ATTRIBUTE, STUN_ERROR, STUN_METHOD,
    writeErrorCode, writeUint32, writeXorAddress,
} from "../stun"
import type {
    StunAttributeValue, StunErrorCode, StunHandler, StunMessage, StunTransport, TransportAddress,
} from "../stun"
import { Allocation } from "./Allocation"
import type { TurnCredentials } from "./Credentials"
import { RelayPolicy } from "./RelayPolicy"

/** How long an allocation lasts when the client asks for no other lifetime, in seconds. */
const DEFAULT_LIFETIME = 600

/** The longest lifetime an allocation is given, in seconds, whatever the client asks. */
const MAX_LIFETIME = 3600

/** How long a nonce stays fresh, in milliseconds. A stale one is answered with a 438 and a new one. */
const NONCE_LIFETIME = 10 * 60_000

/** How many hexadecimal digits of HMAC sign a nonce. */
const NONCE_SIGNATURE_LENGTH = 16

/** The protocol number of UDP in REQUESTED-TRANSPORT, the only transport the relay offers. */
const UDP_TRANSPORT = 17

/** The code of IPv4 in REQUESTED-ADDRESS-FAMILY, the only family the relay offers. */
const IPV4_FAMILY = 0x01

/** The channel numbers a client may bind, as RFC 8656 sets. */
const CHANNEL_NUMBERS = { min: 0x4000, max: 0x4fff }

/** How many ports of the range are tried before an Allocate request is refused for lack of capacity. */
const PORT_ATTEMPTS = 20

/** What the TURN server relays with. */
export interface TurnServerOptions {
    /** The realm of the long-term credentials, the domain of the server. */
    readonly realm: string

    readonly credentials: TurnCredentials

    /** The public IPv4 address peers reach the relay ports at. */
    readonly relayAddress: string

    /** The local address relay ports bind to, every interface by default. */
    readonly relayBind?: string

    /** The range relay ports are taken from, any free port by default. A firewall opens this range. */
    readonly relayPorts?: { readonly min: number, readonly max: number }

    readonly policy?: RelayPolicy
}

/**
 * A TURN server (RFC 8656) relaying UDP over IPv4, which the {@link StunServer} hands every message other
 * than a Binding request. Clients authenticate with the time-limited credentials the signaling server
 * issued them, so the two share no state but a secret.
 *
 * @remarks
 * An allocation is named by the 5-tuple of its client: a request from the same client address over the same
 * transport finds it again. Allocate requests are answered again with the same response when repeated, since
 * a client retransmits a request over UDP until it hears the answer.
 */
export class TurnServer implements StunHandler {


    public readonly policy: RelayPolicy


    constructor(
        public readonly options: TurnServerOptions,
    ){
        this.policy = options.policy ?? new RelayPolicy()
    }


    /** How many allocations are open. */
    public get allocations(): number { return this.#allocations.size }

    public message(message: StunMessage, from: StunTransport): void {
        if(message.kind === "indication"){
            if(message.method === STUN_METHOD.SEND) this.#send(message, from)
            return
        }
        // An answer or an unknown method is nothing a client sends a TURN server: it is dropped.
        if(message.kind !== "request") return
        const isTurnMethod = message.method === STUN_METHOD.ALLOCATE || message.method === STUN_METHOD.REFRESH
            || message.method === STUN_METHOD.CREATE_PERMISSION || message.method === STUN_METHOD.CHANNEL_BIND
        if(!isTurnMethod){
            from.send(message.answer("error", errorOf(STUN_ERROR.BAD_REQUEST)).write({ fingerprint: true }))
            return
        }
        const key = this.#authenticate(message, from)
        if(key) this.#request(message, from, key)
    }

    public channelData(channel: number, data: Uint8Array, from: StunTransport): void {
        const allocation = this.#allocations.get(from.key)
        const bound = allocation?.channel(channel)
        if(allocation && bound) allocation.toPeer(bound.peer, data)
    }

    public closed(from: StunTransport): void {
        this.#allocations.get(from.key)?.close()
    }

    /** End every allocation. */
    public close(): void {
        for(const allocation of [...this.#allocations.values()]) allocation.close()
    }


    readonly #allocations = new Map<string, Allocation>()

    /** The secret nonces are signed with, new at each start: a restart only makes clients ask again. */
    readonly #nonceSecret = randomBytes(32)


    //// Authentication ////

    /**
     * Check the long-term credentials of a request, answering it when they fail.
     *
     * @returns The key the answer is sealed with, none when the request was refused.
     */
    #authenticate(request: StunMessage, from: StunTransport): Uint8Array|null {
        const { realm, credentials } = this.options
        const challenge = (code: StunErrorCode): null => {
            from.send(request.answer("error", [
                ...errorOf(code),
                { type: STUN_ATTRIBUTE.REALM, value: encode(realm) },
                { type: STUN_ATTRIBUTE.NONCE, value: encode(this.#nonce()) },
            ]).write({ fingerprint: true }))
            return null
        }
        const isSealed = request.attribute(STUN_ATTRIBUTE.MESSAGE_INTEGRITY) !== null
        if(!isSealed) return challenge(STUN_ERROR.UNAUTHENTICATED)
        const username = request.text(STUN_ATTRIBUTE.USERNAME)
        const nonce = request.text(STUN_ATTRIBUTE.NONCE)
        if(username === null || nonce === null || request.text(STUN_ATTRIBUTE.REALM) === null){
            from.send(request.answer("error", errorOf(STUN_ERROR.BAD_REQUEST)).write({ fingerprint: true }))
            return null
        }
        if(!this.#isFresh(nonce)) return challenge(STUN_ERROR.STALE_NONCE)
        const password = credentials.passwordOf(username)
        if(password === null) return challenge(STUN_ERROR.UNAUTHENTICATED)
        const key = longTermKey(username, realm, password)
        if(!request.isSealedWith(key)) return challenge(STUN_ERROR.UNAUTHENTICATED)
        return key
    }

    /** A nonce: when it was made, signed, so it is checked without being kept. */
    #nonce(now = Date.now()): string {
        const time = now.toString(16)
        return `${time}${this.#signatureOf(time)}`
    }

    #isFresh(nonce: string, now = Date.now()): boolean {
        const time = nonce.slice(0, -NONCE_SIGNATURE_LENGTH)
        const isSigned = time.length > 0 && this.#signatureOf(time) === nonce.slice(-NONCE_SIGNATURE_LENGTH)
        return isSigned && now - parseInt(time, 16) < NONCE_LIFETIME
    }

    #signatureOf(time: string): string {
        return createHmac("sha1", this.#nonceSecret).update(time).digest("hex").slice(0, NONCE_SIGNATURE_LENGTH)
    }


    //// Requests ////

    #request(request: StunMessage, from: StunTransport, key: Uint8Array): void {
        const answer = (kind: "success"|"error", attributes: readonly StunAttributeValue[]): Uint8Array => {
            const software = { type: STUN_ATTRIBUTE.SOFTWARE, value: encode(SOFTWARE) }
            return request.answer(kind, [...attributes, software]).write({ key, fingerprint: true })
        }
        const refuse = (code: StunErrorCode): void => from.send(answer("error", errorOf(code)))
        const allocation = this.#allocations.get(from.key)
        if(request.method === STUN_METHOD.ALLOCATE){
            this.#allocate(request, from, allocation, answer, refuse)
            return
        }
        if(!allocation){
            refuse(STUN_ERROR.ALLOCATION_MISMATCH)
            return
        }
        if(allocation.username !== request.text(STUN_ATTRIBUTE.USERNAME)){
            refuse(STUN_ERROR.WRONG_CREDENTIALS)
            return
        }
        switch(request.method){
            case STUN_METHOD.REFRESH: {
                const lifetime = lifetimeOf(request)
                if(lifetime === 0) allocation.close()
                else allocation.refresh(lifetime * 1000)
                from.send(answer("success", [{ type: STUN_ATTRIBUTE.LIFETIME, value: writeUint32(lifetime) }]))
                break
            }
            case STUN_METHOD.CREATE_PERMISSION: {
                const peers = request.all(STUN_ATTRIBUTE.XOR_PEER_ADDRESS)
                    .map(value => readXorAddress(value, request.transactionId))
                const problem = this.#problemWith(peers)
                if(problem){
                    refuse(problem)
                    break
                }
                for(const peer of peers) if(peer) allocation.permit(peer)
                from.send(answer("success", []))
                break
            }
            case STUN_METHOD.CHANNEL_BIND: {
                const channel = channelNumberOf(request)
                const peer = readXorAddressOf(request)
                const isValid = channel >= CHANNEL_NUMBERS.min && channel <= CHANNEL_NUMBERS.max
                const problem = isValid ? this.#problemWith([peer]) : STUN_ERROR.BAD_REQUEST
                if(problem || !peer){
                    refuse(problem ?? STUN_ERROR.BAD_REQUEST)
                    break
                }
                if(allocation.bind(channel, peer)) from.send(answer("success", []))
                else refuse(STUN_ERROR.BAD_REQUEST)
                break
            }
            default:
                refuse(STUN_ERROR.BAD_REQUEST)
                break
        }
    }

    #allocate(
        request: StunMessage,
        from: StunTransport,
        existing: Allocation|undefined,
        answer: (kind: "success"|"error", attributes: readonly StunAttributeValue[]) => Uint8Array,
        refuse: (code: StunErrorCode) => void,
    ): void {
        if(existing){
            const isRepeated = Buffer.compare(existing.transactionId, request.transactionId) === 0
            if(isRepeated) from.send(existing.answer)
            else refuse(STUN_ERROR.ALLOCATION_MISMATCH)
            return
        }
        const transport = request.attribute(STUN_ATTRIBUTE.REQUESTED_TRANSPORT)
        if(!transport || transport.length !== 4){
            refuse(STUN_ERROR.BAD_REQUEST)
            return
        }
        if(transport[0] !== UDP_TRANSPORT){
            refuse(STUN_ERROR.UNSUPPORTED_TRANSPORT)
            return
        }
        const family = request.attribute(STUN_ATTRIBUTE.REQUESTED_ADDRESS_FAMILY)
        if(family && family[0] !== IPV4_FAMILY){
            refuse(STUN_ERROR.ADDRESS_FAMILY_NOT_SUPPORTED)
            return
        }
        const username = request.text(STUN_ATTRIBUTE.USERNAME) ?? ""
        const holder = this.options.credentials.holderOf(username)
        const held = [...this.#allocations.values()].filter(allocation => {
            return this.options.credentials.holderOf(allocation.username) === holder
        })
        if(held.length >= this.policy.maxAllocations){
            refuse(STUN_ERROR.ALLOCATION_QUOTA_REACHED)
            return
        }
        void this.#bindRelay().then(socket => {
            if(!socket){
                refuse(STUN_ERROR.INSUFFICIENT_CAPACITY)
                return
            }
            // Another Allocate from the same client may have won the race while the port was bound.
            if(this.#allocations.has(from.key)){
                socket.close()
                refuse(STUN_ERROR.ALLOCATION_MISMATCH)
                return
            }
            const relayed: TransportAddress = {
                family: 4,
                address: this.options.relayAddress,
                port: socket.address().port,
            }
            const forget = (over: Allocation): void => {
                if(this.#allocations.get(over.client.key) === over) this.#allocations.delete(over.client.key)
            }
            const meter = this.policy.meter()
            const transactionId = request.transactionId
            const allocation = new Allocation(from, username, transactionId, relayed, socket, meter, forget)
            const lifetime = lifetimeOf(request)
            allocation.refresh(lifetime * 1000)
            allocation.answer = answer("success", [
                { type: STUN_ATTRIBUTE.XOR_RELAYED_ADDRESS, value: writeXorAddress(relayed, transactionId) },
                {
                    type: STUN_ATTRIBUTE.XOR_MAPPED_ADDRESS,
                    value: writeXorAddress(from.client, transactionId),
                },
                { type: STUN_ATTRIBUTE.LIFETIME, value: writeUint32(lifetime) },
            ])
            this.#allocations.set(from.key, allocation)
            from.send(allocation.answer)
        })
    }

    /** A UDP socket bound to a relay port, none when no port of the range is free. */
    async #bindRelay(): Promise<UdpSocket|null> {
        const range = this.options.relayPorts
        const attempts = range ? PORT_ATTEMPTS : 1
        for(let attempt = 0; attempt < attempts; attempt++){
            const port = range ? range.min + Math.floor(Math.random() * (range.max - range.min + 1)) : 0
            const socket = createSocket("udp4")
            const isBound = await new Promise<boolean>(resolve => {
                socket.once("error", () => resolve(false))
                socket.bind(port, this.options.relayBind, () => resolve(true))
            })
            if(isBound) return socket
            socket.close()
        }
        return null
    }

    /** Why these peers cannot be reached, none when they all can. */
    #problemWith(peers: readonly (TransportAddress|null)[]): StunErrorCode|null {
        if(peers.length === 0 || peers.includes(null)) return STUN_ERROR.BAD_REQUEST
        if(peers.some(peer => peer?.family !== 4)) return STUN_ERROR.PEER_ADDRESS_FAMILY_MISMATCH
        if(peers.some(peer => peer && !this.policy.allowsPeer(peer))) return STUN_ERROR.FORBIDDEN
        return null
    }

    /** Pass what a client sends a peer in a Send indication, which goes unanswered whatever happens. */
    #send(indication: StunMessage, from: StunTransport): void {
        const allocation = this.#allocations.get(from.key)
        const peer = readXorAddressOf(indication)
        const data = indication.attribute(STUN_ATTRIBUTE.DATA)
        if(allocation && peer && data) allocation.toPeer(peer, data)
    }
}

/**
 * The lifetime a request gets, in seconds: what it asks for, within {@link DEFAULT_LIFETIME} and
 * {@link MAX_LIFETIME}, the default when it asks for none, and 0 for a Refresh asking to delete.
 */
function lifetimeOf(request: StunMessage): number {
    const value = request.attribute(STUN_ATTRIBUTE.LIFETIME)
    const asked = value === null ? null : readUint32(value)
    if(asked === null) return DEFAULT_LIFETIME
    if(asked === 0 && request.method === STUN_METHOD.REFRESH) return 0
    return Math.min(Math.max(asked, DEFAULT_LIFETIME), MAX_LIFETIME)
}

/** The channel number a ChannelBind asks for, -1 when it asks for none. */
function channelNumberOf(request: StunMessage): number {
    const value = request.attribute(STUN_ATTRIBUTE.CHANNEL_NUMBER)
    if(!value || value.length !== 4) return -1
    return new DataView(value.buffer, value.byteOffset, 4).getUint16(0)
}

function readXorAddressOf(message: StunMessage): TransportAddress|null {
    const value = message.attribute(STUN_ATTRIBUTE.XOR_PEER_ADDRESS)
    return value === null ? null : readXorAddress(value, message.transactionId)
}

function errorOf(code: StunErrorCode): StunAttributeValue[] {
    return [{ type: STUN_ATTRIBUTE.ERROR_CODE, value: writeErrorCode(code) }]
}

function encode(text: string): Uint8Array {
    return new TextEncoder().encode(text)
}
