import { crc32 } from "./crc32"

/** The first bytes of every value the game writes, to recognize a file of the game. */
const MAGIC = [0x52, 0x47, 0x4c, 0x4b]

/** The layout of the envelope itself, to be able to change it later. */
const ENVELOPE_VERSION = 1

/** Where the fields sit, in bytes from the start of the envelope. All are little-endian. */
const ENVELOPE_VERSION_OFFSET = 4
const FORMAT_VERSION_OFFSET = 6
const LENGTH_OFFSET = 8
const CRC_OFFSET = 12

/** The size of the envelope before its payload, in bytes. */
const HEADER_SIZE = 16

/** The highest format version the envelope can carry, on its two bytes. */
export const MAX_FORMAT_VERSION = 0xffff

/** What an envelope carries: the payload, and the version of the format it is written in. */
export interface EnvelopeContent {
    readonly formatVersion: number
    readonly payload: Uint8Array
}

/**
 * Wrap a payload in an envelope, so a damaged save is detected when read back.
 *
 * @param formatVersion - The version of the format the payload is written in.
 * @param payload - The JSON of the save, in UTF-8.
 */
export function sealEnvelope(formatVersion: number, payload: Uint8Array): Uint8Array {
    const bytes = new Uint8Array(HEADER_SIZE + payload.length)
    const view = new DataView(bytes.buffer)
    bytes.set(MAGIC)
    view.setUint16(ENVELOPE_VERSION_OFFSET, ENVELOPE_VERSION, true)
    view.setUint16(FORMAT_VERSION_OFFSET, formatVersion, true)
    view.setUint32(LENGTH_OFFSET, payload.length, true)
    view.setUint32(CRC_OFFSET, crc32(payload), true)
    bytes.set(payload, HEADER_SIZE)
    return bytes
}

/**
 * Take the payload out of an envelope.
 *
 * @returns The content of the envelope, or the reason it cannot be trusted.
 */
export function openEnvelope(bytes: Uint8Array): EnvelopeContent|string {
    const isGameFile = bytes.length >= HEADER_SIZE && MAGIC.every((byte, i) => bytes[i] === byte)
    if(!isGameFile) return "it is not a save of the game"
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const envelopeVersion = view.getUint16(ENVELOPE_VERSION_OFFSET, true)
    if(envelopeVersion !== ENVELOPE_VERSION) return `its envelope version ${envelopeVersion} is unknown`
    const length = view.getUint32(LENGTH_OFFSET, true)
    const held = bytes.length - HEADER_SIZE
    if(held !== length) return `it holds ${held} bytes of content instead of ${length}`
    const payload = bytes.subarray(HEADER_SIZE)
    if(crc32(payload) !== view.getUint32(CRC_OFFSET, true)) return "its CRC does not match its content"
    return { formatVersion: view.getUint16(FORMAT_VERSION_OFFSET, true), payload }
}
