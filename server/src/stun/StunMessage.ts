import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { crc32 } from "node:zlib"

import { STUN_ATTRIBUTE } from "./StunAttribute"
import { MAGIC_COOKIE } from "./TransportAddress"

/** The length of a STUN header, in bytes. */
export const HEADER_LENGTH = 20

/** The length of a transaction id, in bytes. */
export const TRANSACTION_ID_LENGTH = 12

/** The length of a MESSAGE-INTEGRITY attribute, header included: a HMAC-SHA1 of 20 bytes. */
const INTEGRITY_LENGTH = 24

/** The length of a FINGERPRINT attribute, header included: a CRC-32. */
const FINGERPRINT_LENGTH = 8

/** What the CRC-32 of a FINGERPRINT is XOR-ed with, so a STUN CRC differs from that of the payload. */
const FINGERPRINT_XOR = 0x5354554e

/**
 * Whether a message asks, tells, or answers:
 * - `"request"`: asks for an answer.
 * - `"indication"`: tells, and expects nothing back.
 * - `"success"` and `"error"`: answer a request, under its transaction id.
 */
export type StunClass = "request"|"indication"|"success"|"error"

const CLASS_BITS: Record<StunClass, number> = { request: 0b00, indication: 0b01, success: 0b10, error: 0b11 }
const CLASS_OF = ["request", "indication", "success", "error"] as const

/** One attribute of a message: its type and raw value. */
export interface StunAttributeValue {
    readonly type: number
    readonly value: Uint8Array
}

/** A message that is no valid STUN message. */
export class StunError extends Error {


    constructor(message: string){
        super(message)
        this.name = "StunError"
    }
}

/** How a message is sealed when written. */
export interface StunSeal {
    /** The key of a MESSAGE-INTEGRITY attribute, none to write none. */
    readonly key?: Uint8Array

    /** Is a FINGERPRINT attribute written last? */
    readonly fingerprint?: boolean
}

/**
 * A STUN message (RFC 8489): a method, a class, a transaction id and attributes. TURN messages are STUN
 * messages with TURN's methods and attributes.
 *
 * @remarks
 * A message read keeps its bytes, since MESSAGE-INTEGRITY and FINGERPRINT are checked against the bytes
 * as they came, padding included, and not against the message written again.
 */
export class StunMessage {


    constructor(
        public readonly method: number,
        public readonly kind: StunClass,
        public readonly transactionId: Uint8Array = randomBytes(TRANSACTION_ID_LENGTH),
        public readonly attributes: readonly StunAttributeValue[] = [],

        /** The bytes the message was read from, none for one built here. */
        public readonly raw?: Uint8Array,
    ){
        if(transactionId.length !== TRANSACTION_ID_LENGTH) throw new Error("A STUN transaction id is 12 bytes long.")
    }


    /** Does a datagram or a chunk of a stream start with a STUN message, rather than channel data? */
    public static isStun(bytes: Uint8Array): boolean {
        if(bytes.length < HEADER_LENGTH || (bytes[0] & 0xc0) !== 0) return false
        return new DataView(bytes.buffer, bytes.byteOffset, 8).getUint32(4) === MAGIC_COOKIE
    }

    /**
     * Read a message.
     *
     * @throws {@link StunError} When the bytes are no well-formed STUN message.
     */
    public static read(bytes: Uint8Array): StunMessage {
        if(!StunMessage.isStun(bytes)) throw new StunError("The bytes are no STUN message.")
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        const type = view.getUint16(0)
        const length = view.getUint16(2)
        if(length % 4 !== 0 || HEADER_LENGTH + length !== bytes.length){
            throw new StunError(`A STUN message says it is ${length} bytes long, and is ${bytes.length - HEADER_LENGTH}.`)
        }
        const attributes: StunAttributeValue[] = []
        for(let at = HEADER_LENGTH; at < bytes.length;){
            if(at + 4 > bytes.length) throw new StunError("A STUN attribute is cut short.")
            const attributeLength = view.getUint16(at + 2)
            const end = at + 4 + attributeLength
            if(end > bytes.length) throw new StunError("A STUN attribute overflows its message.")
            attributes.push({ type: view.getUint16(at), value: bytes.slice(at + 4, end) })
            at = end + padding(attributeLength)
        }
        const method = (type & 0x000f) | (type & 0x00e0) >> 1 | (type & 0x3e00) >> 2
        const kind = CLASS_OF[(type & 0x0010) >> 4 | (type & 0x0100) >> 7]
        return new StunMessage(method, kind, bytes.slice(8, HEADER_LENGTH), attributes, bytes.slice())
    }

    /** The value of the first attribute of a type, none when the message has none. */
    public attribute(type: number): Uint8Array|null {
        return this.attributes.find(attribute => attribute.type === type)?.value ?? null
    }

    /** The text of the first attribute of a type, none when the message has none. */
    public text(type: number): string|null {
        const value = this.attribute(type)
        return value === null ? null : new TextDecoder().decode(value)
    }

    /** Every value of the attributes of a type, in order. */
    public all(type: number): Uint8Array[] {
        return this.attributes.filter(attribute => attribute.type === type).map(attribute => attribute.value)
    }

    /** An answer to this request, under its transaction id. */
    public answer(kind: "success"|"error", attributes: readonly StunAttributeValue[]): StunMessage {
        return new StunMessage(this.method, kind, this.transactionId, attributes)
    }

    /**
     * Write the message, with a MESSAGE-INTEGRITY and a FINGERPRINT when asked. The attributes of those types
     * the message holds are dropped, since they are computed.
     */
    public write(seal: StunSeal = {}): Uint8Array {
        const sealed = new Set<number>([STUN_ATTRIBUTE.MESSAGE_INTEGRITY, STUN_ATTRIBUTE.FINGERPRINT])
        const attributes = this.attributes.filter(attribute => !sealed.has(attribute.type))
        const sizeOf = (value: Uint8Array): number => 4 + value.length + padding(value.length)
        const bodyLength = attributes.reduce((sum, { value }) => sum + sizeOf(value), 0)
        const sealLength = (seal.key ? INTEGRITY_LENGTH : 0) + (seal.fingerprint ? FINGERPRINT_LENGTH : 0)
        const length = bodyLength + sealLength
        const bytes = new Uint8Array(HEADER_LENGTH + length)
        const view = new DataView(bytes.buffer)
        view.setUint16(0, this.#type())
        view.setUint32(4, MAGIC_COOKIE)
        bytes.set(this.transactionId, 8)
        let at = HEADER_LENGTH
        for(const { type, value } of attributes){
            view.setUint16(at, type)
            view.setUint16(at + 2, value.length)
            bytes.set(value, at + 4)
            at += 4 + value.length + padding(value.length)
        }
        if(seal.key){
            view.setUint16(2, at + INTEGRITY_LENGTH - HEADER_LENGTH)
            view.setUint16(at, STUN_ATTRIBUTE.MESSAGE_INTEGRITY)
            view.setUint16(at + 2, INTEGRITY_LENGTH - 4)
            bytes.set(hmacOf(seal.key, bytes.subarray(0, at)), at + 4)
            at += INTEGRITY_LENGTH
        }
        if(seal.fingerprint){
            view.setUint16(2, at + FINGERPRINT_LENGTH - HEADER_LENGTH)
            view.setUint16(at, STUN_ATTRIBUTE.FINGERPRINT)
            view.setUint16(at + 2, FINGERPRINT_LENGTH - 4)
            view.setUint32(at + 4, fingerprintOf(bytes.subarray(0, at)))
        }
        view.setUint16(2, length)
        return bytes
    }

    /**
     * Was this message, as read, sealed with this key? None of a message without MESSAGE-INTEGRITY is.
     *
     * @remarks
     * The HMAC covers the message up to the attribute, with a length that counts the attribute and nothing
     * after it, so a FINGERPRINT added later leaves it valid.
     */
    public isSealedWith(key: Uint8Array): boolean {
        const at = this.#offsetOf(STUN_ATTRIBUTE.MESSAGE_INTEGRITY)
        if(at === null || !this.raw) return false
        const signed = this.raw.slice(0, at)
        new DataView(signed.buffer).setUint16(2, at + INTEGRITY_LENGTH - HEADER_LENGTH)
        const expected = hmacOf(key, signed)
        const actual = this.raw.subarray(at + 4, at + INTEGRITY_LENGTH)
        return actual.length === expected.length && timingSafeEqual(expected, actual)
    }

    /** Does this message, as read, carry no FINGERPRINT, or one that matches? */
    public isFingerprintValid(): boolean {
        const at = this.#offsetOf(STUN_ATTRIBUTE.FINGERPRINT)
        if(at === null || !this.raw) return true
        const actual = new DataView(this.raw.buffer, this.raw.byteOffset).getUint32(at + 4)
        return actual === fingerprintOf(this.raw.subarray(0, at))
    }


    #type(): number {
        const method = this.method
        const bits = CLASS_BITS[this.kind]
        const methodBits = (method & 0x000f) | (method & 0x0070) << 1 | (method & 0x0f80) << 2
        return methodBits | (bits & 1) << 4 | (bits & 2) << 7
    }

    /** Where the attribute of a type starts in the bytes read, none when the message has none. */
    #offsetOf(type: number): number|null {
        if(!this.raw) return null
        let at = HEADER_LENGTH
        for(const attribute of this.attributes){
            if(attribute.type === type) return at
            at += 4 + attribute.value.length + padding(attribute.value.length)
        }
        return null
    }
}

/** The key of MESSAGE-INTEGRITY for long-term credentials: MD5 of `username:realm:password`. */
export function longTermKey(username: string, realm: string, password: string): Uint8Array {
    return createHash("md5").update(`${username}:${realm}:${password}`).digest()
}

/** How many bytes pad a value of this length to a multiple of four. */
export function padding(length: number): number {
    return (4 - length % 4) % 4
}

function hmacOf(key: Uint8Array, bytes: Uint8Array): Uint8Array {
    return createHmac("sha1", key).update(bytes).digest()
}

// The length field already counts the FINGERPRINT when this runs, as the RFC asks.
function fingerprintOf(bytes: Uint8Array): number {
    return (crc32(bytes) ^ FINGERPRINT_XOR) >>> 0
}
