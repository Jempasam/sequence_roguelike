/** The methods of STUN (RFC 8489) and TURN (RFC 8656) this server knows. */
export const STUN_METHOD = {
    BINDING: 0x001,
    ALLOCATE: 0x003,
    REFRESH: 0x004,
    SEND: 0x006,
    DATA: 0x007,
    CREATE_PERMISSION: 0x008,
    CHANNEL_BIND: 0x009,
} as const

/** The types of the attributes this server reads or writes. */
export const STUN_ATTRIBUTE = {
    MAPPED_ADDRESS: 0x0001,
    USERNAME: 0x0006,
    MESSAGE_INTEGRITY: 0x0008,
    ERROR_CODE: 0x0009,
    UNKNOWN_ATTRIBUTES: 0x000a,
    CHANNEL_NUMBER: 0x000c,
    LIFETIME: 0x000d,
    XOR_PEER_ADDRESS: 0x0012,
    DATA: 0x0013,
    REALM: 0x0014,
    NONCE: 0x0015,
    XOR_RELAYED_ADDRESS: 0x0016,
    REQUESTED_ADDRESS_FAMILY: 0x0017,
    REQUESTED_TRANSPORT: 0x0019,
    XOR_MAPPED_ADDRESS: 0x0020,
    PRIORITY: 0x0024,
    USE_CANDIDATE: 0x0025,
    SOFTWARE: 0x8022,
    FINGERPRINT: 0x8028,
    ICE_CONTROLLED: 0x8029,
    ICE_CONTROLLING: 0x802a,
} as const

/**
 * The attributes a request may carry without being refused. An attribute under 0x8000 is one the receiver
 * must understand: any other one of those gets a 420 answer listing it. DONT-FRAGMENT, EVEN-PORT and
 * RESERVATION-TOKEN are left out on purpose, since the relay does not honor them.
 */
export const UNDERSTOOD_ATTRIBUTES: ReadonlySet<number> = new Set(Object.values(STUN_ATTRIBUTE))

/** Is this attribute one the receiver must understand, or else refuse the request? */
export function isComprehensionRequired(type: number): boolean {
    return type < 0x8000
}

/** The error codes this server answers with, and their reason phrases. */
export const STUN_ERROR = {
    BAD_REQUEST: [400, "Bad Request"],
    UNAUTHENTICATED: [401, "Unauthenticated"],
    FORBIDDEN: [403, "Forbidden"],
    UNKNOWN_ATTRIBUTE: [420, "Unknown Attribute"],
    ALLOCATION_MISMATCH: [437, "Allocation Mismatch"],
    STALE_NONCE: [438, "Stale Nonce"],
    ADDRESS_FAMILY_NOT_SUPPORTED: [440, "Address Family not Supported"],
    WRONG_CREDENTIALS: [441, "Wrong Credentials"],
    UNSUPPORTED_TRANSPORT: [442, "Unsupported Transport Protocol"],
    PEER_ADDRESS_FAMILY_MISMATCH: [443, "Peer Address Family Mismatch"],
    ALLOCATION_QUOTA_REACHED: [486, "Allocation Quota Reached"],
    SERVER_ERROR: [500, "Server Error"],
    INSUFFICIENT_CAPACITY: [508, "Insufficient Capacity"],
} as const satisfies Record<string, readonly [number, string]>

/** An error code and its reason phrase. */
export type StunErrorCode = readonly [number, string]

/** The value of an ERROR-CODE attribute. */
export function writeErrorCode([code, reason]: StunErrorCode): Uint8Array {
    const text = new TextEncoder().encode(reason)
    const value = new Uint8Array(4 + text.length)
    value[2] = Math.floor(code / 100)
    value[3] = code % 100
    value.set(text, 4)
    return value
}

/** The code an ERROR-CODE attribute holds, none when it holds no valid one. */
export function readErrorCode(value: Uint8Array): number|null {
    if(value.length < 4) return null
    return (value[2] & 0x7) * 100 + value[3]
}

/** The value of a 32-bit attribute, such as LIFETIME. */
export function writeUint32(number: number): Uint8Array {
    const value = new Uint8Array(4)
    new DataView(value.buffer).setUint32(0, number)
    return value
}

/** The number a 32-bit attribute holds, none when it holds no 32-bit value. */
export function readUint32(value: Uint8Array): number|null {
    if(value.length !== 4) return null
    return new DataView(value.buffer, value.byteOffset, 4).getUint32(0)
}
