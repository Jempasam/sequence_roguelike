import { describe, expect, test } from "vitest"

import { readErrorCode, STUN_ATTRIBUTE, STUN_ERROR, STUN_METHOD, writeErrorCode } from "./StunAttribute"
import { longTermKey, StunMessage } from "./StunMessage"
import { readXorAddress, writeXorAddress } from "./TransportAddress"

// --- Fixture builders ---

function bytesOf(hex: string): Uint8Array {
    return Uint8Array.from(hex.replace(/\s+/g, "").match(/../g)!.map(byte => parseInt(byte, 16)))
}

/** The short-term password of the test vectors of RFC 5769. */
const PASSWORD = new TextEncoder().encode("VOkJxbRl1RmTxUk/WvJxBt")

/** RFC 5769, 2.1: a Binding request with ICE attributes, padded with spaces. */
const SAMPLE_REQUEST = bytesOf(`
    00 01 00 58 21 12 a4 42 b7 e7 a7 01 bc 34 d6 86 fa 87 df ae
    80 22 00 10 53 54 55 4e 20 74 65 73 74 20 63 6c 69 65 6e 74
    00 24 00 04 6e 00 01 ff 80 29 00 08 93 2f f9 b1 51 26 3b 36
    00 06 00 09 65 76 74 6a 3a 68 36 76 59 20 20 20
    00 08 00 14 9a ea a7 0c bf d8 cb 56 78 1e f2 b5 b2 d3 f2 49 c1 b5 71 a2
    80 28 00 04 e5 7a 3b cf`)

/** RFC 5769, 2.2: a Binding success answering at 192.0.2.1:32853. */
const IPV4_RESPONSE = bytesOf(`
    01 01 00 3c 21 12 a4 42 b7 e7 a7 01 bc 34 d6 86 fa 87 df ae
    80 22 00 0b 74 65 73 74 20 76 65 63 74 6f 72 20
    00 20 00 08 00 01 a1 47 e1 12 a6 43
    00 08 00 14 2b 91 f5 99 fd 9e 90 c3 8c 74 89 f9 2a f9 ba 53 f0 6b e7 d7
    80 28 00 04 c0 7d 4c 96`)

/** RFC 5769, 2.3: a Binding success answering at [2001:db8:1234:5678:11:2233:4455:6677]:32853. */
const IPV6_RESPONSE = bytesOf(`
    01 01 00 48 21 12 a4 42 b7 e7 a7 01 bc 34 d6 86 fa 87 df ae
    80 22 00 0b 74 65 73 74 20 76 65 63 74 6f 72 20
    00 20 00 14 00 02 a1 47 01 13 a9 fa a5 d3 f1 79 bc 25 f4 b5 be d2 b9 d9
    00 08 00 14 a3 82 95 4e 4b e6 7b f1 17 84 c9 7c 82 92 c2 75 bf e3 ed 41
    80 28 00 04 c8 fb 0b 4c`)

/** RFC 5769, 2.4: a request with long-term credentials, after SASLprep of the password. */
const LONG_TERM_REQUEST = bytesOf(`
    00 01 00 60 21 12 a4 42 78 ad 34 33 c6 ad 72 c0 29 da 41 2e
    00 06 00 12 e3 83 9e e3 83 88 e3 83 aa e3 83 83 e3 82 af e3 82 b9 00 00
    00 15 00 1c 66 2f 2f 34 39 39 6b 39 35 34 64 36 4f 4c 33 34 6f 4c 39 46 53 54 76 79 36 34 73 41
    00 14 00 0b 65 78 61 6d 70 6c 65 2e 6f 72 67 00
    00 08 00 14 f6 70 24 65 6d d6 4a 3e 02 b8 e0 71 2e 85 c9 a2 8c a8 96 66`)

// --- Tests ---

describe("StunMessage.read", () => {
    test("sample request → Binding request, its attributes read past their padding", () => {
        const message = StunMessage.read(SAMPLE_REQUEST)
        expect(message.method).toBe(STUN_METHOD.BINDING)
        expect(message.kind).toBe("request")
        expect(message.text(STUN_ATTRIBUTE.SOFTWARE)).toBe("STUN test client")
        expect(message.text(STUN_ATTRIBUTE.USERNAME)).toBe("evtj:h6vY")
    })

    test("IPv4 response → success at 192.0.2.1:32853", () => {
        const message = StunMessage.read(IPV4_RESPONSE)
        expect(message.kind).toBe("success")
        const value = message.attribute(STUN_ATTRIBUTE.XOR_MAPPED_ADDRESS)!
        expect(readXorAddress(value, message.transactionId)).toEqual({ family: 4, address: "192.0.2.1", port: 32853 })
    })

    test("IPv6 response → address unmasked with the transaction id", () => {
        const message = StunMessage.read(IPV6_RESPONSE)
        const value = message.attribute(STUN_ATTRIBUTE.XOR_MAPPED_ADDRESS)!
        expect(readXorAddress(value, message.transactionId)).toEqual({
            family: 6, address: "2001:db8:1234:5678:11:2233:4455:6677", port: 32853,
        })
    })

    test("length that disagrees with the bytes → error", () => {
        expect(() => StunMessage.read(SAMPLE_REQUEST.slice(0, -4))).toThrow()
    })
})

describe("StunMessage.isSealedWith", () => {
    test("vectors with their short-term password → sealed", () => {
        for(const bytes of [SAMPLE_REQUEST, IPV4_RESPONSE, IPV6_RESPONSE]){
            expect(StunMessage.read(bytes).isSealedWith(PASSWORD)).toBe(true)
        }
    })

    test("long-term vector with MD5(username:realm:password) → sealed", () => {
        const key = longTermKey("マトリックス", "example.org", "TheMatrIX")
        expect(StunMessage.read(LONG_TERM_REQUEST).isSealedWith(key)).toBe(true)
    })

    test("wrong password → not sealed", () => {
        expect(StunMessage.read(SAMPLE_REQUEST).isSealedWith(new TextEncoder().encode("nope"))).toBe(false)
    })

    test("one flipped byte → not sealed", () => {
        const bytes = IPV4_RESPONSE.slice()
        bytes[30] ^= 1
        expect(StunMessage.read(bytes).isSealedWith(PASSWORD)).toBe(false)
    })
})

describe("StunMessage.isFingerprintValid", () => {
    test("vectors → valid", () => {
        for(const bytes of [SAMPLE_REQUEST, IPV4_RESPONSE, IPV6_RESPONSE]){
            expect(StunMessage.read(bytes).isFingerprintValid()).toBe(true)
        }
    })

    test("one flipped byte → invalid", () => {
        const bytes = SAMPLE_REQUEST.slice()
        bytes[25] ^= 1
        expect(StunMessage.read(bytes).isFingerprintValid()).toBe(false)
    })
})

describe("StunMessage.write", () => {
    test("sealed message read back → same attributes, sealed, valid fingerprint", () => {
        const request = StunMessage.read(IPV4_RESPONSE)
        const address = { family: 4, address: "192.0.2.1", port: 32853 } as const
        const written = request.answer("success", [
            { type: STUN_ATTRIBUTE.SOFTWARE, value: new TextEncoder().encode("test vector") },
            {
                type: STUN_ATTRIBUTE.XOR_MAPPED_ADDRESS,
                value: writeXorAddress(address, request.transactionId),
            },
        ]).write({ key: PASSWORD, fingerprint: true })
        const read = StunMessage.read(written)
        expect(read.isSealedWith(PASSWORD)).toBe(true)
        expect(read.isFingerprintValid()).toBe(true)
        const mapped = read.attribute(STUN_ATTRIBUTE.XOR_MAPPED_ADDRESS)!
        expect(readXorAddress(mapped, read.transactionId)).toEqual(address)
    })

    test("vector without its padding spaces → same bytes but the padding and seals", () => {
        const message = StunMessage.read(IPV4_RESPONSE)
        const written = message.write({ key: PASSWORD, fingerprint: true })
        expect(written.length).toBe(IPV4_RESPONSE.length)
        expect(StunMessage.read(written).method).toBe(STUN_METHOD.BINDING)
        expect(StunMessage.read(written).kind).toBe("success")
    })

    test("every method and class → read back the same", () => {
        for(const method of Object.values(STUN_METHOD)){
            for(const kind of ["request", "indication", "success", "error"] as const){
                const read = StunMessage.read(new StunMessage(method, kind).write())
                expect([read.method, read.kind]).toEqual([method, kind])
            }
        }
    })
})

describe("writeErrorCode", () => {
    test("438 → read back 438", () => {
        expect(readErrorCode(writeErrorCode(STUN_ERROR.STALE_NONCE))).toBe(438)
    })
})
