// Indexed colour for the paintings: an image brought to as few colours as its tolerance allows, 256 at most,
// a colour too far from any of them made of two neighbours by an ordered dither, and written as a palette PNG.
// Used by buildParallax.ts. See raw_assets/mecard/parallax/METHOD.md.

import { crc32, deflateSync } from "node:zlib"

export interface Pixels { width: number, height: number, rgba: Uint8Array }

/** An image indexed: its pixels as they now are, its PNG, how many colours it kept and its worst gap. */
export interface Indexed {
    readonly pixels: Pixels
    readonly png: Uint8Array
    readonly colors: number
    readonly error: number
}

/** Colours at most, the transparent one among them. */
const MAX_COLORS = 256

/** How far two colours may stand to be mixed by the dither, in tolerances: farther, the mix shows as a grain. */
const MIX_REACH = 3

/** Palette colours tried around each colour, to replace it alone or by a pair. */
const NEIGHBOURS = 6

/** Passes of k-means after the median cut. */
const PASSES = 4

/** The ordered dither, 4 by 4, its thresholds in sixteenths. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

type Lab = [number, number, number, number]

/** How a colour is replaced: one palette entry, or two mixed, `mix` the share of the second. */
interface Replacement { first: number, second: number, mix: number, error: number }

/**
 * Index an image: the fewest colours whose replacement of every colour, alone or dithered between two
 * neighbours, stays within `tolerance` (a distance in OKLab, alpha as a fourth axis), 256 at most.
 * @param cell - The side of a pixel of the drawing in the image, so the dither has its size.
 */
export function indexImage(image: Pixels, tolerance: number, cell: number): Indexed {
    const { keys, weights, labs, hasClear, reduced } = histogram(image)
    const room = MAX_COLORS - (hasClear ? 1 : 0)
    let palette: Lab[], replacements: Replacement[]
    if(keys.length <= room){
        palette = labs
        replacements = labs.map((_, index) => ({ first: index, second: index, mix: 0, error: 0 }))
    }
    else {
        const tried = (count: number) => {
            const colours = paletteOf(labs, weights, count)
            const replaced = replace(labs, colours, tolerance)
            return { colours, replaced, error: Math.max(...replaced.map(r => r.error)) }
        }
        // The fewest colours within the tolerance: halving, the gap taken as growing smaller with more colours.
        let low = 1, high = room, best = tried(room)
        while(low < high){
            const middle = (low + high) >> 1
            const attempt = tried(middle)
            if(attempt.error <= tolerance){
                best = attempt
                high = middle
            }
            else low = middle + 1
        }
        if(best.colours.length !== low) best = tried(low)
        palette = best.colours
        replacements = best.replaced
    }
    return write(image, keys, palette, replacements, hasClear, cell, reduced)
}

/** The distinct colours of an image that show, their pixel counts and OKLab coordinates. */
function histogram(image: Pixels): {
    keys: number[], weights: number[], labs: Lab[], hasClear: boolean, reduced: boolean
} {
    let counts = new Map<number, number>()
    let hasClear = false
    for(let i = 0; i < image.rgba.length; i += 4){
        if(image.rgba[i + 3] === 0){
            hasClear = true
            continue
        }
        const key = keyOf(image.rgba, i)
        counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    // Too many colours to keep: they are grouped at 6 bits, so the palette search works on far fewer. An image
    // that fits is left exact.
    const reduced = counts.size > MAX_COLORS - (hasClear ? 1 : 0)
    if(reduced){
        const grouped = new Map<number, number>()
        for(const [key, count] of counts){
            const near = reduceKey(key)
            grouped.set(near, (grouped.get(near) ?? 0) + count)
        }
        counts = grouped
    }
    const keys = [...counts.keys()]
    return { keys, weights: keys.map(key => counts.get(key)!), labs: keys.map(labOf), hasClear, reduced }
}

/** A colour packed in a number, its red, green and blue brought to the nearest of 64 levels, its alpha kept. */
function reduceKey(key: number): number {
    const level = (byte: number) => Math.round(Math.round(byte * 63 / 255) * 255 / 63)
    return ((level(key >>> 24) << 24) | (level((key >>> 16) & 255) << 16) | (level((key >>> 8) & 255) << 8) | (key & 255)) >>> 0
}

function keyOf(rgba: Uint8Array, i: number): number {
    return ((rgba[i] << 24) | (rgba[i + 1] << 16) | (rgba[i + 2] << 8) | rgba[i + 3]) >>> 0
}

/** OKLab of an RGBA colour packed in a number, its alpha from 0 to 1 as a fourth axis. */
function labOf(key: number): Lab {
    const linear = (byte: number) => {
        const c = byte / 255
        return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    const r = linear(key >>> 24), g = linear((key >>> 16) & 255), b = linear((key >>> 8) & 255)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return [
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
        (key & 255) / 255,
    ]
}

/** The RGBA bytes of an OKLab colour. */
function rgbaOf(lab: Lab): [number, number, number, number] {
    const l = (lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2]) ** 3
    const m = (lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2]) ** 3
    const s = (lab[0] - 0.0894841775 * lab[1] - 1.2914855480 * lab[2]) ** 3
    const byte = (c: number) => {
        const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055
        return Math.max(0, Math.min(255, Math.round(v * 255)))
    }
    return [
        byte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
        byte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
        byte(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
        Math.max(1, Math.min(255, Math.round(lab[3] * 255))),
    ]
}

function distance(a: Lab, b: Lab): number {
    // Not Math.hypot: it is several times slower, and this is the innermost call.
    const l = a[0] - b[0], x = a[1] - b[1], y = a[2] - b[2], alpha = a[3] - b[3]
    return Math.sqrt(l * l + x * x + y * y + alpha * alpha)
}

/** `count` colours standing for the weighted ones: the median cut, then a few passes of k-means. */
function paletteOf(labs: Lab[], weights: number[], count: number): Lab[] {
    let boxes: number[][] = [labs.map((_, index) => index)]
    while(boxes.length < count){
        // The box spreading the most, weighted, is cut at its weighted median along its widest axis.
        let widest = -1, chosen = -1, axis = 0
        boxes.forEach((box, index) => {
            if(box.length < 2) return
            let weight = 0
            for(const i of box) weight += weights[i]
            for(let a = 0; a < 4; a++){
                let min = Infinity, max = -Infinity
                for(const i of box){
                    min = Math.min(min, labs[i][a])
                    max = Math.max(max, labs[i][a])
                }
                const spread = (max - min) * Math.sqrt(weight)
                if(spread > widest){
                    widest = spread
                    chosen = index
                    axis = a
                }
            }
        })
        if(chosen < 0) break
        const box = boxes[chosen].sort((a, b) => labs[a][axis] - labs[b][axis])
        const half = box.reduce((sum, i) => sum + weights[i], 0) / 2
        let running = 0, at = 1
        for(; at < box.length - 1; at++){
            running += weights[box[at - 1]]
            if(running >= half) break
        }
        boxes.splice(chosen, 1, box.slice(0, at), box.slice(at))
    }
    let centres = boxes.map(box => mean(box, labs, weights))
    for(let pass = 0; pass < PASSES; pass++){
        const groups: number[][] = centres.map(() => [])
        labs.forEach((lab, index) => {
            let nearest = 0, best = Infinity
            centres.forEach((centre, c) => {
                const d = distance(lab, centre)
                if(d < best){
                    best = d
                    nearest = c
                }
            })
            groups[nearest].push(index)
        })
        centres = groups.map((group, c) => group.length ? mean(group, labs, weights) : centres[c])
    }
    return centres
}

function mean(indices: number[], labs: Lab[], weights: number[]): Lab {
    const sum: Lab = [0, 0, 0, 0]
    let total = 0
    for(const i of indices){
        for(let a = 0; a < 4; a++) sum[a] += labs[i][a] * weights[i]
        total += weights[i]
    }
    return sum.map(v => v / total) as Lab
}

/** The best replacement of each colour: its nearest palette entry, or the mix of two close neighbours. */
function replace(labs: Lab[], palette: Lab[], tolerance: number): Replacement[] {
    const reach = MIX_REACH * tolerance
    // The nearest entries, nearest first, ties by palette order: what a stable sort then slice gives, without
    // sorting the whole palette for each colour.
    const nearIndex = new Int32Array(NEIGHBOURS)
    const nearDistance = new Float64Array(NEIGHBOURS)
    return labs.map(lab => {
        let count = 0
        for(let index = 0; index < palette.length; index++){
            const d = distance(lab, palette[index])
            if(count === NEIGHBOURS && d >= nearDistance[NEIGHBOURS - 1]) continue
            let at = count < NEIGHBOURS ? count++ : NEIGHBOURS - 1
            while(at > 0 && nearDistance[at - 1] > d){
                nearDistance[at] = nearDistance[at - 1]
                nearIndex[at] = nearIndex[at - 1]
                at--
            }
            nearDistance[at] = d
            nearIndex[at] = index
        }
        const near = Array.from({ length: count }, (_, i) => ({ index: nearIndex[i], d: nearDistance[i] }))
        let best: Replacement = { first: near[0].index, second: near[0].index, mix: 0, error: near[0].d }
        for(let i = 0; i < near.length; i++){
            for(let j = i + 1; j < near.length; j++){
                const p = palette[near[i].index], q = palette[near[j].index]
                const span = distance(p, q)
                if(span === 0 || span > reach) continue
                let along = 0
                for(let a = 0; a < 4; a++) along += (lab[a] - p[a]) * (q[a] - p[a])
                const mix = Math.max(0, Math.min(1, along / (span * span)))
                const point = p.map((v, a) => v + (q[a] - v) * mix) as Lab
                const error = distance(lab, point)
                if(error < best.error) best = { first: near[i].index, second: near[j].index, mix, error }
            }
        }
        return best
    })
}

/** The image drawn with the palette, dithered where a colour is a mix, and its palette PNG. */
function write(
    image: Pixels, keys: number[], palette: Lab[], replacements: Replacement[],
    hasClear: boolean, cell: number, reduced: boolean,
): Indexed {
    const offset = hasClear ? 1 : 0
    const entries = palette.map(rgbaOf)
    const byKey = new Map(keys.map((key, index) => [key, replacements[index]]))
    const { width, height } = image
    const indices = new Uint8Array(width * height)
    const rgba = new Uint8Array(width * height * 4)
    for(let y = 0; y < height; y++){
        for(let x = 0; x < width; x++){
            const at = x + y * width
            if(image.rgba[at * 4 + 3] === 0) continue
            const key = keyOf(image.rgba, at * 4)
            const r = byKey.get(reduced ? reduceKey(key) : key)!
            const threshold = (BAYER[(Math.floor(x / cell) & 3) + (Math.floor(y / cell) & 3) * 4] + 0.5) / 16
            const entry = r.mix > threshold ? r.second : r.first
            indices[at] = entry + offset
            rgba.set(entries[entry], at * 4)
        }
    }
    const error = Math.max(0, ...replacements.map(r => r.error))
    const colors = new Set(indices).size
    return { pixels: { width, height, rgba }, png: encodeIndexed(width, height, indices, entries, hasClear), colors, error }
}

/** A palette PNG, 8 bits, the transparent entry first when there is one, every row unfiltered. */
function encodeIndexed(width: number, height: number, indices: Uint8Array, entries: number[][], hasClear: boolean): Uint8Array {
    const all = hasClear ? [[0, 0, 0, 0], ...entries] : entries
    const header = Buffer.alloc(13)
    header.writeUInt32BE(width, 0)
    header.writeUInt32BE(height, 4)
    header[8] = 8
    header[9] = 3
    const raw = Buffer.alloc(height * (1 + width))
    for(let y = 0; y < height; y++) raw.set(indices.subarray(y * width, (y + 1) * width), y * (1 + width) + 1)
    const alphas = all.map(entry => entry[3])
    while(alphas.length && alphas[alphas.length - 1] === 255) alphas.pop()
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", header),
        chunk("PLTE", Buffer.from(all.flatMap(entry => entry.slice(0, 3)))),
        ...(alphas.length ? [chunk("tRNS", Buffer.from(alphas))] : []),
        chunk("IDAT", deflateSync(raw, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ])
}

function chunk(type: string, body: Buffer): Buffer {
    const head = Buffer.alloc(8)
    head.writeUInt32BE(body.length, 0)
    head.write(type, 4, "ascii")
    const tail = Buffer.alloc(4)
    tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0)
    return Buffer.concat([head, body, tail])
}
