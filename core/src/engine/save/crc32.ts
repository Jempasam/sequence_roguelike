/** The reversed polynomial of CRC-32, the one zlib and PNG use. */
const POLYNOMIAL = 0xedb88320

/** The CRC of each byte value, so a byte costs one lookup instead of eight shifts. */
const TABLE = Uint32Array.from({ length: 256 }, (_, byte) => {
    let crc = byte
    for(let bit = 0; bit < 8; bit++) crc = crc & 1 ? POLYNOMIAL ^ crc >>> 1 : crc >>> 1
    return crc
})

/** The CRC-32 of some bytes, as zlib computes it. */
export function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff
    for(const byte of bytes) crc = TABLE[(crc ^ byte) & 0xff] ^ crc >>> 8
    return (crc ^ 0xffffffff) >>> 0
}
