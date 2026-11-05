import { crc32, deflateSync } from "node:zlib"

/** The color types of PNG, by their IHDR value. */
export const GREY = 0
export const RGB = 2
export const INDEXED = 3
export const GREY_ALPHA = 4
export const RGBA = 6

/** The number of samples per pixel of each color type. */
const CHANNELS: Readonly<Record<number, number>> = {
    [GREY]: 1, [RGB]: 3, [INDEXED]: 1, [GREY_ALPHA]: 2, [RGBA]: 4,
}

/** What a PNG built for a test holds. */
export interface PngSpec {
    readonly width: number
    readonly height: number
    readonly colorType: number
    /** The size of a sample, in bits. 8 when none. */
    readonly depth?: number
    /** Every sample of the image, row by row, unpacked. */
    readonly samples: readonly number[]
    /** The RGB entries of the palette, for an indexed image. */
    readonly palette?: readonly (readonly [number, number, number])[]
    /** The raw content of the tRNS chunk. */
    readonly transparency?: readonly number[]
    /** Marks the image as Adam7 in its IHDR. The data stays row by row, so only the flag is tested. */
    readonly interlaced?: boolean
    /** More chunks, written before the image data. */
    readonly chunks?: readonly (readonly [string, Uint8Array])[]
}

/**
 * A PNG file built byte by byte, independently of the decoder under test, so every color type, depth and
 * chunk can be tried without a drawing tool.
 */
export function png(spec: PngSpec): Uint8Array {
    const depth = spec.depth ?? 8
    const header = new Uint8Array(13)
    const view = new DataView(header.buffer)
    view.setUint32(0, spec.width)
    view.setUint32(4, spec.height)
    header.set([depth, spec.colorType, 0, 0, spec.interlaced ? 1 : 0], 8)
    const chunks: (readonly [string, Uint8Array])[] = [["IHDR", header], ...spec.chunks ?? []]
    if(spec.palette) chunks.push(["PLTE", Uint8Array.from(spec.palette.flat())])
    if(spec.transparency) chunks.push(["tRNS", Uint8Array.from(spec.transparency)])
    chunks.push(["IDAT", deflateSync(rowsOf(spec, depth))], ["IEND", new Uint8Array(0)])
    const signature = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    return concat([signature, ...chunks.map(([type, data]) => chunk(type, data))])
}

/** The unfiltered rows of the image, each led by filter type 0 and packed at its depth. */
function rowsOf(spec: PngSpec, depth: number): Uint8Array {
    const perRow = spec.width * CHANNELS[spec.colorType]
    const rowSize = Math.ceil(perRow * depth / 8)
    const rows = new Uint8Array(spec.height * (rowSize + 1))
    for(let y = 0; y < spec.height; y++){
        const start = y * (rowSize + 1) + 1
        for(let i = 0; i < perRow; i++){
            const sample = spec.samples[y * perRow + i]
            if(depth === 16){
                rows[start + i * 2] = sample >> 8
                rows[start + i * 2 + 1] = sample & 0xff
            } else {
                const bit = i * depth
                rows[start + Math.floor(bit / 8)] |= sample << 8 - depth - bit % 8
            }
        }
    }
    return rows
}

function chunk(type: string, data: Uint8Array): Uint8Array {
    const typeAndData = concat([new TextEncoder().encode(type), data])
    const out = new Uint8Array(8 + data.length + 4)
    const view = new DataView(out.buffer)
    view.setUint32(0, data.length)
    out.set(typeAndData, 4)
    view.setUint32(8 + data.length, crc32(typeAndData))
    return out
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0))
    let offset = 0
    for(const part of parts){
        out.set(part, offset)
        offset += part.length
    }
    return out
}
