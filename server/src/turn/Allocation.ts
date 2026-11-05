import { randomBytes } from "node:crypto"
import type { Socket as UdpSocket } from "node:dgram"

import {
    addressKey, STUN_ATTRIBUTE, STUN_METHOD, StunMessage, TRANSACTION_ID_LENGTH, transportAddress,
    writeXorAddress,
} from "../stun"
import type { StunTransport, TransportAddress } from "../stun"
import type { ByteMeter } from "./RelayPolicy"

/** How long a permission lasts, in milliseconds: five minutes, as RFC 8656 sets. */
export const PERMISSION_LIFETIME = 300_000

/** How long a channel binding lasts, in milliseconds: ten minutes, as RFC 8656 sets. */
export const CHANNEL_LIFETIME = 600_000

/** A channel bound to a peer. */
interface Channel {
    readonly number: number
    readonly peer: TransportAddress
    expiresAt: number
}

/**
 * One client's port on the relay: what peers send it is passed to the client, and what the client sends
 * through it reaches peers, those it gave a permission to only.
 *
 * @remarks
 * Permissions are by IP address, ports aside, and channels bind a number to one peer address, so the
 * client sends to that peer with a 4-byte header instead of a whole STUN indication.
 */
export class Allocation {


    /** The answer to the Allocate request that made it, sent again when a client repeats the request. */
    public answer: Uint8Array = new Uint8Array(0)

    /** When the allocation ends unless refreshed, in milliseconds. */
    public expiresAt = 0


    constructor(
        /** The way to the client, whose 5-tuple names the allocation. */
        public readonly client: StunTransport,

        /** The username the client allocated with, which every later request must use too. */
        public readonly username: string,

        /** The transaction id of the Allocate request that made it. */
        public readonly transactionId: Uint8Array,

        /** The address peers reach the relay at. */
        public readonly relayed: TransportAddress,

        socket: UdpSocket,
        meter: ByteMeter,

        /** Called once the allocation is over: expired, deleted, or its client gone. */
        onOver: (allocation: Allocation) => void,
    ){
        this.#socket = socket
        this.#meter = meter
        this.#onOver = onOver
        socket.on("message", (bytes, from) => {
            this.#fromPeer(new Uint8Array(bytes), transportAddress(from.address, from.port))
        })
        socket.on("error", () => this.close())
    }


    /** Make the allocation last this long from now on, in milliseconds. */
    public refresh(lifetime: number, now = Date.now()): void {
        this.expiresAt = now + lifetime
        clearTimeout(this.#timer)
        this.#timer = setTimeout(() => this.close(), lifetime)
    }

    /** Let the client and a peer at this IP reach each other, for {@link PERMISSION_LIFETIME}. */
    public permit(peer: TransportAddress, now = Date.now()): void {
        this.#permissions.set(peer.address, now + PERMISSION_LIFETIME)
    }

    /** May the client and a peer at this IP reach each other? */
    public isPermitted(peer: TransportAddress, now = Date.now()): boolean {
        return (this.#permissions.get(peer.address) ?? 0) > now
    }

    /** The channel bound to this number, none when the number is free or its binding expired. */
    public channel(number: number, now = Date.now()): Channel|null {
        const channel = this.#channels.get(number)
        return channel && channel.expiresAt > now ? channel : null
    }

    /**
     * Bind a channel to a peer, or refresh its binding, and permit the peer.
     *
     * @returns Whether it was bound: a number bound to another peer, or a peer bound to another number,
     * stays as it was until its binding expires.
     */
    public bind(number: number, peer: TransportAddress, now = Date.now()): boolean {
        const byNumber = this.channel(number, now)
        const byPeer = this.#byPeer.get(addressKey(peer))
        const isTaken = byNumber !== null && addressKey(byNumber.peer) !== addressKey(peer)
        const isRebound = byPeer !== undefined && byPeer.number !== number && byPeer.expiresAt > now
        if(isTaken || isRebound) return false
        const channel = byNumber ?? { number, peer, expiresAt: 0 }
        channel.expiresAt = now + CHANNEL_LIFETIME
        this.#channels.set(number, channel)
        this.#byPeer.set(addressKey(peer), channel)
        this.permit(peer, now)
        return true
    }

    /** Send bytes from the client to a peer, if it is permitted and the meter allows. */
    public toPeer(peer: TransportAddress, data: Uint8Array): void {
        if(!this.isPermitted(peer) || !this.#meter.take(data.length)) return
        this.#socket.send(data, peer.port, peer.address)
    }

    /** End the allocation and free its port. Doing it twice changes nothing. */
    public close(): void {
        if(this.#isClosed) return
        this.#isClosed = true
        clearTimeout(this.#timer)
        this.#socket.close()
        this.#onOver(this)
    }


    readonly #socket: UdpSocket
    readonly #meter: ByteMeter
    readonly #onOver: (allocation: Allocation) => void
    #timer: ReturnType<typeof setTimeout>|undefined
    #isClosed = false

    /** When the permission of each IP ends, in milliseconds. */
    readonly #permissions = new Map<string, number>()

    readonly #channels = new Map<number, Channel>()
    readonly #byPeer = new Map<string, Channel>()

    /**
     * Pass what a peer sent to the client, through its channel when one is bound, in a Data indication
     * otherwise. What comes from a peer without a permission is dropped, as RFC 8656 asks.
     */
    #fromPeer(data: Uint8Array, peer: TransportAddress): void {
        if(!this.isPermitted(peer) || !this.#meter.take(data.length)) return
        const channel = this.#byPeer.get(addressKey(peer))
        const now = Date.now()
        if(channel && channel.expiresAt > now){
            this.client.send(channelDataOf(channel.number, data, this.client.protocol !== "udp"))
            return
        }
        const transactionId = randomBytes(TRANSACTION_ID_LENGTH)
        this.client.send(new StunMessage(STUN_METHOD.DATA, "indication", transactionId, [
            { type: STUN_ATTRIBUTE.XOR_PEER_ADDRESS, value: writeXorAddress(peer, transactionId) },
            { type: STUN_ATTRIBUTE.DATA, value: data },
        ]).write())
    }
}

/** A ChannelData message, padded to four bytes over a stream, where the next message must stay aligned. */
function channelDataOf(number: number, data: Uint8Array, isStream: boolean): Uint8Array {
    const padded = isStream ? Math.ceil(data.length / 4) * 4 : data.length
    const bytes = new Uint8Array(4 + padded)
    const view = new DataView(bytes.buffer)
    view.setUint16(0, number)
    view.setUint16(2, data.length)
    bytes.set(data, 4)
    return bytes
}
