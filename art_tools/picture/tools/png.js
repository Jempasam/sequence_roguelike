import { deflateSync, inflateSync } from "node:zlib"

/**
 * Minimal PNG reader, the twin of `encodePng`: 8-bit grey, grey+alpha, RGB, RGBA or palette, not
 * interlaced — what an image saved by any common tool is. Returns straight RGBA.
 * @param {Uint8Array} bytes
 * @returns {{width: number, height: number, rgba: Uint8Array}}
 */
export function decodePng(bytes){
    const data = Buffer.from(bytes)
    if(data.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG file (convert it to PNG first)")
    let offset = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0
    /** @type {Buffer[]} */ const idat = []
    /** @type {any} */ let palette = null
    /** @type {any} */ let transparency = null
    while(offset < data.length){
        const length = data.readUInt32BE(offset)
        const type = data.toString("latin1", offset + 4, offset + 8)
        const body = data.subarray(offset + 8, offset + 8 + length)
        if(type === "IHDR"){
            width = body.readUInt32BE(0); height = body.readUInt32BE(4)
            bitDepth = body[8]; colorType = body[9]; interlace = body[12]
        }
        else if(type === "PLTE") palette = body
        else if(type === "tRNS") transparency = body
        else if(type === "IDAT") idat.push(body)
        else if(type === "IEND") break
        offset += 12 + length
    }
    if(bitDepth !== 8) throw new Error(`PNG of ${bitDepth} bits per channel: only 8 is read, re-save it as 8-bit`)
    if(interlace) throw new Error("interlaced PNG: re-save it without interlacing")
    const channels = /** @type {any} */ ({0: 1, 2: 3, 3: 1, 4: 2, 6: 4})[colorType]
    if(!channels) throw new Error(`PNG colour type ${colorType} unknown`)
    const raw = inflateSync(Buffer.concat(idat))
    const stride = width * channels
    const pixels = new Uint8Array(stride * height)
    for(let y = 0; y < height; y++){
        const filter = raw[y * (stride + 1)]
        const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
        for(let x = 0; x < stride; x++){
            const a = x >= channels ? pixels[y*stride + x - channels] : 0
            const b = y > 0 ? pixels[(y - 1)*stride + x] : 0
            const c = x >= channels && y > 0 ? pixels[(y - 1)*stride + x - channels] : 0
            let value = line[x]
            if(filter === 1) value += a
            else if(filter === 2) value += b
            else if(filter === 3) value += (a + b) >> 1
            else if(filter === 4){
                const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
                value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
            }
            pixels[y*stride + x] = value & 0xff
        }
    }
    const rgba = new Uint8Array(width * height * 4)
    for(let i = 0; i < width * height; i++){
        const s = i * channels
        let r, g, b, alpha = 255
        if(colorType === 0){ r = g = b = pixels[s] }
        else if(colorType === 4){ r = g = b = pixels[s]; alpha = pixels[s + 1] }
        else if(colorType === 2){ r = pixels[s]; g = pixels[s + 1]; b = pixels[s + 2] }
        else if(colorType === 6){ r = pixels[s]; g = pixels[s + 1]; b = pixels[s + 2]; alpha = pixels[s + 3] }
        else {
            const index = pixels[s]
            r = palette[index*3]; g = palette[index*3 + 1]; b = palette[index*3 + 2]
            alpha = transparency && index < transparency.length ? transparency[index] : 255
        }
        rgba.set([r, g, b, alpha], i * 4)
    }
    return {width, height, rgba}
}

/**
 * Minimal PNG writer: 8-bit RGBA, no interlacing, one IDAT. Deliberately dependency-free — the
 * point of `BakedPicture.toPixels()` is that the shading pipeline runs with nothing but Node, and
 * a PNG encoder pulled from npm would put a dependency back in the way of that claim.
 */

/** @param {number} type @param {Uint8Array} data */
function chunk(type, data){
    const out = Buffer.alloc(data.length + 12)
    out.writeUInt32BE(data.length, 0)
    out.writeUInt32BE(type, 4)
    Buffer.from(data).copy(out, 8)
    out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
    return out
}

const CRC_TABLE = Array.from({length: 256}, (_, n) => {
    let c = n
    for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
})

/** @param {Uint8Array} bytes */
function crc32(bytes){
    let c = 0xffffffff
    for(const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}

/**
 * Encode straight RGBA bytes — exactly what `BakedPicture.toPixels()` returns — as a PNG.
 * `scale` repeats each pixel, which is what makes a 16x16 icon readable at a glance.
 * @param {{width:number, height:number, rgba:Uint8Array}} pixels
 * @param {number=} scale
 * @returns {Buffer}
 */
export function encodePng({width, height, rgba}, scale = 1){
    const w = width*scale
    const h = height*scale
    // Each row is prefixed with its filter byte (0 = none).
    const raw = Buffer.alloc(h * (1 + w*4))
    for(let y = 0; y < h; y++){
        const rowStart = y * (1 + w*4)
        raw[rowStart] = 0
        for(let x = 0; x < w; x++){
            const from = (Math.floor(x/scale) + Math.floor(y/scale)*width) * 4
            raw[rowStart + 1 + x*4 + 0] = rgba[from + 0]
            raw[rowStart + 1 + x*4 + 1] = rgba[from + 1]
            raw[rowStart + 1 + x*4 + 2] = rgba[from + 2]
            raw[rowStart + 1 + x*4 + 3] = rgba[from + 3]
        }
    }

    const header = Buffer.alloc(13)
    header.writeUInt32BE(w, 0)
    header.writeUInt32BE(h, 4)
    header[8] = 8    // bit depth
    header[9] = 6    // colour type: RGBA
    header[10] = 0   // deflate
    header[11] = 0   // adaptive filtering
    header[12] = 0   // no interlace

    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk(0x49484452, header),                 // IHDR
        chunk(0x49444154, deflateSync(raw, {level: 9})),  // IDAT
        chunk(0x49454e44, new Uint8Array(0)),      // IEND
    ])
}
