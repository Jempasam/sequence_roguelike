import { isIPv4, isIPv6 } from "node:net"

/** An IP address and a port, as STUN carries them. */
export interface TransportAddress {
    readonly family: 4|6
    readonly address: string
    readonly port: number
}

/** The STUN codes of the address families. */
const FAMILY_CODE = { 4: 0x01, 6: 0x02 } as const

/** The magic cookie every STUN message carries, which XOR-ed addresses are masked with. */
export const MAGIC_COOKIE = 0x2112a442

/** A key naming an address, the same for the same address however it is written. */
export function addressKey(address: TransportAddress): string {
    return `${address.address}|${address.port}`
}

/** An address read from a socket, which Node may write `::ffff:1.2.3.4` when it listens on IPv6. */
export function transportAddress(address: string, port: number): TransportAddress {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)
    if(mapped) return { family: 4, address: mapped[1], port }
    if(isIPv4(address)) return { family: 4, address, port }
    if(isIPv6(address)) return { family: 6, address: ipv6Text(ipv6Bytes(address)), port }
    throw new Error(`"${address}" is no IP address.`)
}

/**
 * The value of an XOR-MAPPED-ADDRESS, XOR-PEER-ADDRESS or XOR-RELAYED-ADDRESS attribute: the port masked
 * with the top of the magic cookie, and the address with the cookie and, for IPv6, the transaction id, so
 * NATs that rewrite addresses they see in packets leave it alone.
 */
export function writeXorAddress(address: TransportAddress, transactionId: Uint8Array): Uint8Array {
    const ip = ipBytes(address)
    const value = new Uint8Array(4 + ip.length)
    const view = new DataView(value.buffer)
    view.setUint8(1, FAMILY_CODE[address.family])
    view.setUint16(2, address.port ^ MAGIC_COOKIE >>> 16)
    const mask = maskOf(transactionId)
    for(let i = 0; i < ip.length; i++) value[4 + i] = ip[i] ^ mask[i]
    return value
}

/**
 * The address an XOR-ed address attribute holds, none when it holds no valid one.
 */
export function readXorAddress(value: Uint8Array, transactionId: Uint8Array): TransportAddress|null {
    if(value.length < 8) return null
    const view = new DataView(value.buffer, value.byteOffset, value.byteLength)
    const family = view.getUint8(1) === FAMILY_CODE[4] ? 4 : view.getUint8(1) === FAMILY_CODE[6] ? 6 : null
    const size = family === 4 ? 4 : 16
    if(family === null || value.length !== 4 + size) return null
    const mask = maskOf(transactionId)
    const ip = value.slice(4).map((byte, i) => byte ^ mask[i])
    const port = view.getUint16(2) ^ MAGIC_COOKIE >>> 16
    return { family, address: family === 4 ? ip.join(".") : ipv6Text(ip), port }
}

/** The bytes the address of an XOR-ed attribute is masked with: the magic cookie, then the transaction id. */
function maskOf(transactionId: Uint8Array): Uint8Array {
    const mask = new Uint8Array(16)
    new DataView(mask.buffer).setUint32(0, MAGIC_COOKIE)
    mask.set(transactionId, 4)
    return mask
}

function ipBytes(address: TransportAddress): Uint8Array {
    if(address.family === 4) return Uint8Array.from(address.address.split(".").map(Number))
    return ipv6Bytes(address.address)
}

function ipv6Bytes(text: string): Uint8Array {
    const [head, tail] = text.includes("::") ? text.split("::") : [text, null]
    const groupsOf = (part: string): number[] => part === "" ? [] : part.split(":").map(group => parseInt(group, 16))
    const left = groupsOf(head)
    const right = tail === null ? [] : groupsOf(tail)
    const groups = [...left, ...new Array<number>(8 - left.length - right.length).fill(0), ...right]
    const bytes = new Uint8Array(16)
    groups.forEach((group, i) => new DataView(bytes.buffer).setUint16(i * 2, group))
    return bytes
}

/** An IPv6 address written in full groups, without leading zeros: `2001:db8:0:0:0:0:0:1`. */
function ipv6Text(bytes: Uint8Array): string {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    return Array.from({ length: 8 }, (_, i) => view.getUint16(i * 2).toString(16)).join(":")
}
