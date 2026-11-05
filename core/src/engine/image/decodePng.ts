import { decode } from "fast-png"
import type { DecodedPng } from "fast-png"

import type { PixelData } from "./PixelData"
import { PngError } from "./PngError"

/** The eight bytes every PNG starts with. */
const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Where the fields of the IHDR chunk sit, in bytes from the start of the file. It always comes first. */
const IHDR_TYPE_OFFSET = 12
const IHDR_DEPTH_OFFSET = 24
const IHDR_COLOR_TYPE_OFFSET = 25
const IHDR_INTERLACE_OFFSET = 28

/** The size of a file holding at least the signature and the fields of IHDR, in bytes. */
const HEADER_SIZE = 29

/** The deepest sample the game accepts, in bits. 16-bit samples would need a hidden rounding choice. */
const MAX_DEPTH = 8

/** The interlace method of a PNG stored row by row. Any other is Adam7. */
const NOT_INTERLACED = 0

/** The color types of PNG, by their IHDR value. */
const GREY = 0
const RGB = 2
const INDEXED = 3
const GREY_ALPHA = 4
const RGBA = 6

/** The value of a fully opaque alpha. */
const OPAQUE = 255

/**
 * Decode a PNG into RGBA8, the same pixels on every platform.
 *
 * Every color type is accepted, grey, grey and alpha, RGB, RGBA, palette with or without `tRNS`, at 1 to 8
 * bits. The color chunks (`gAMA`, `iCCP`, `sRGB`, `cHRM`) are ignored on purpose: the pixels are the
 * values stored in the file, which a data image (normals, masks) relies on.
 *
 * @param bytes - The content of the PNG file.
 * @param name - The name of the image, only used in error messages.
 * @throws {@link PngError} When the bytes are not a PNG, or one in a refused format: 16-bit or interlaced.
 */
export function decodePng(bytes: Uint8Array, name: string): PixelData {
    const colorType = colorTypeOf(bytes, name)
    let png: DecodedPng
    try {
        png = decode(bytes, { checkCrc: true })
    } catch(cause){
        throw new PngError("invalid", `${name} is not a valid PNG.`, { cause })
    }
    return { width: png.width, height: png.height, data: rgbaOf(png, colorType, name) }
}


//// Header ////

/** The color type of a PNG, after refusing the formats fast-png would decode but the game does not. */
function colorTypeOf(bytes: Uint8Array, name: string): number {
    const hasSignature = bytes.length >= HEADER_SIZE && SIGNATURE.every((byte, i) => bytes[i] === byte)
    const ihdr = String.fromCharCode(...bytes.subarray(IHDR_TYPE_OFFSET, IHDR_TYPE_OFFSET + 4))
    if(!hasSignature || ihdr !== "IHDR") throw new PngError("invalid", `${name} is not a PNG.`)
    if(bytes[IHDR_DEPTH_OFFSET] > MAX_DEPTH){
        throw new PngError("unsupported", `${name} is a 16-bit PNG. Export it in 8 bits.`)
    }
    if(bytes[IHDR_INTERLACE_OFFSET] !== NOT_INTERLACED){
        throw new PngError("unsupported", `${name} is an interlaced PNG. Export it without interlacing.`)
    }
    return bytes[IHDR_COLOR_TYPE_OFFSET]
}


//// Pixels ////

/** The pixels of a decoded PNG, converted to RGBA8 whatever its color type and depth. */
function rgbaOf(png: DecodedPng, colorType: number, name: string): Uint8Array {
    const { width, height, depth, channels } = png
    const samples = new SampleReader(png.data, Math.ceil(width * channels * depth / 8), depth)
    // 255, 85, 17 or 1: exact integers, so a low-depth grey widens without rounding.
    const scale = OPAQUE / ((1 << depth) - 1)
    const key = png.transparency
    const rgba = new Uint8Array(width * height * 4)
    for(let y = 0; y < height; y++){
        for(let x = 0; x < width; x++){
            const first = x * channels
            const out = (y * width + x) * 4
            switch(colorType){
                case GREY: {
                    const grey = samples.at(y, first)
                    const value = grey * scale
                    rgba.set([value, value, value, key?.[0] === grey ? 0 : OPAQUE], out)
                    break
                }
                case GREY_ALPHA: {
                    const grey = samples.at(y, first)
                    rgba.set([grey, grey, grey, samples.at(y, first + 1)], out)
                    break
                }
                case RGB: {
                    const r = samples.at(y, first)
                    const g = samples.at(y, first + 1)
                    const b = samples.at(y, first + 2)
                    const isKey = key !== undefined && key[0] === r && key[1] === g && key[2] === b
                    rgba.set([r, g, b, isKey ? 0 : OPAQUE], out)
                    break
                }
                case RGBA:
                    for(let c = 0; c < 4; c++) rgba[out + c] = samples.at(y, first + c)
                    break
                case INDEXED:
                    rgba.set(paletteColorOf(png, samples.at(y, first), name), out)
                    break
                default:
                    throw new PngError("invalid", `${name} has an unknown color type ${colorType}.`)
            }
        }
    }
    return rgba
}

/** The RGBA color of a palette entry. Without `tRNS`, an entry has no alpha and is opaque. */
function paletteColorOf(png: DecodedPng, index: number, name: string): readonly number[] {
    const color = png.palette?.[index]
    if(!color) throw new PngError("invalid", `${name} uses palette entry ${index}, which it does not have.`)
    return color.length === 4 ? color : [color[0], color[1], color[2], OPAQUE]
}

/**
 * Reads the samples of the rows fast-png unfilters, which stay packed below 8 bits: several samples share
 * a byte, the first one in its highest bits.
 */
class SampleReader {


    constructor(
        /** The unfiltered rows, one after the other. */
        readonly data: ArrayLike<number>,

        /** The size of one row, in bytes. */
        readonly rowSize: number,

        /** The size of one sample, in bits. */
        readonly depth: number,
    ){}


    /** The sample of a row, by its index in the row. */
    at(row: number, index: number): number {
        const start = row * this.rowSize
        if(this.depth === 8) return this.data[start + index]
        const bit = index * this.depth
        const shift = 8 - this.depth - bit % 8
        return this.data[start + Math.floor(bit / 8)] >> shift & (1 << this.depth) - 1
    }
}
