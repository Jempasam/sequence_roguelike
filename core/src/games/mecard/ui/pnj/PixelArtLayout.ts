import type { PixelData } from "../../../../engine/image"

/**
 * How dense a row or a column of a sprite must be to be of the body, in the share of the densest one: a
 * sword or a staff held out, a few pixels wide, is thinner than that and stays out.
 */
export const BODY_DENSITY = 0.5

/** How wide the place of a hat is, in the width of the body: a hat is drawn wider than its place. */
const HAT_WIDTH = 0.5

/** How high the place of a hat is, in the height of the top of the character. */
const HAT_SHARE = 0.2

/** Where the place of a mask lies in the top of the character, from its top to its bottom, in its height. */
const MASK_FROM = 0.35
const MASK_TO = 0.8

/** How wide the place of a mask is, in the width of the body. */
const MASK_WIDTH = 0.7

/** How many pixels of the sprite a pixel of the picture of a mask or an object takes, in the body width. */
const ACCESSORY_PIXEL_SHARE = 1 / 30

/** A rectangle of a sprite, in its pixels. */
export interface PixelRect {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
}

/**
 * Where the parts of a character drawn from a sprite lie, in the pixels of the sprite. The canvas is the box
 * around every pixel that is not transparent, so a margin of transparent pixels does not lift the character
 * from the ground; its origin is the top left corner of that box, `y` down.
 *
 * The character is cut in three, by two lines at the thirds of its height: its top, its middle and its
 * bottom.
 */
export interface PixelArtLayout {
    /** The box around the character, in the pixels of the sprite. */
    readonly bounds: PixelRect

    /** The size of the canvas. The character stands on its bottom edge, its middle on its vertical center. */
    readonly width: number
    readonly height: number

    /** The three parts, each as wide as the canvas, from the top. */
    readonly top: PixelRect
    readonly middle: PixelRect
    readonly bottom: PixelRect

    /** The line the body starts to bend at, the top of its bottom, and how high it curves over it. */
    readonly bendLine: number
    readonly band: number

    /** The body, without what it holds out. */
    readonly zone: PixelRect

    /** The top of the head, which a hat barely covers. */
    readonly hatPlace: PixelRect

    /** The face, where a mask is worn. */
    readonly maskPlace: PixelRect

    /** Where an object is carried: a line along its width, through its middle. */
    readonly itemPlace: PixelRect

    /** How many pixels of the sprite a pixel of the picture of a mask or of an object takes at size 1. */
    readonly accessoryPixel: number
}

/** Is the pixel at a place of an image not transparent? */
function isOpaque(pixels: PixelData, x: number, y: number): boolean {
    return pixels.data[(y * pixels.width + x) * 4 + 3] > 0
}

/** The box around every pixel of an image that is not transparent, none when it is all transparent. */
export function boundsOf(pixels: PixelData): PixelRect|null {
    let left = pixels.width
    let top = pixels.height
    let right = -1
    let bottom = -1
    for(let y = 0; y < pixels.height; y++){
        for(let x = 0; x < pixels.width; x++){
            if(!isOpaque(pixels, x, y)) continue
            left = Math.min(left, x)
            right = Math.max(right, x)
            top = Math.min(top, y)
            bottom = Math.max(bottom, y)
        }
    }
    return right < 0 ? null : { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

/** The range of the counts around the greatest one, as far as they stay dense, as `[first, end[`. */
function denseRange(counts: readonly number[]): [first: number, end: number] {
    let peak = 0
    for(let at = 1; at < counts.length; at++) if(counts[at] > counts[peak]) peak = at
    const floor = counts[peak] * BODY_DENSITY
    let first = peak
    let end = peak + 1
    while(first > 0 && counts[first - 1] >= floor) first--
    while(end < counts.length && counts[end] >= floor) end++
    return [first, end]
}

/**
 * The body of a sprite, without what it holds out: the columns and the rows around the densest ones that
 * are dense enough, {@link BODY_DENSITY}. What a character holds touches its body, so no gap tells them
 * apart: only how thin it is does.
 *
 * @throws {@link Error} When the sprite is all transparent.
 */
export function bodyZoneOf(pixels: PixelData): PixelRect {
    const columns = new Array<number>(pixels.width).fill(0)
    const rows = new Array<number>(pixels.height).fill(0)
    let any = false
    for(let y = 0; y < pixels.height; y++){
        for(let x = 0; x < pixels.width; x++){
            if(!isOpaque(pixels, x, y)) continue
            columns[x]++
            rows[y]++
            any = true
        }
    }
    if(!any) throw new Error("A character is drawn from a sprite with something in it, this one is transparent.")
    const [left, right] = denseRange(columns)
    const [top, bottom] = denseRange(rows)
    return { x: left, y: top, width: right - left, height: bottom - top }
}

/**
 * Where an object is carried, the middle of a pixel of the sprite: on the right of the body, below the row
 * `from`. Of the pixels of the zone of the body from that row, the rightmost column is taken, and in it the
 * pixel nearest the middle of the body. The zone, not every pixel, so what the character holds out does not
 * pull the object to its tip.
 */
export function itemSpotOf(pixels: PixelData, zone: PixelRect, from: number): { x: number, y: number } {
    const bottom = zone.y + zone.height
    const middle = (from + bottom) / 2
    for(let x = zone.x + zone.width - 1; x >= zone.x; x--){
        let best = -1
        for(let y = from; y < bottom; y++){
            if(!isOpaque(pixels, x, y)) continue
            if(best < 0 || Math.abs(y + 0.5 - middle) < Math.abs(best + 0.5 - middle)) best = y
        }
        if(best >= 0) return { x: x + 0.5, y: best + 0.5 }
    }
    return { x: zone.x + zone.width / 2, y: middle }
}

/** The first row, from `from` down to the bottom of the zone, with a pixel in the columns of the zone. */
function firstRowOf(pixels: PixelData, zone: PixelRect, from: number): number {
    for(let y = from; y < zone.y + zone.height; y++){
        for(let x = zone.x; x < zone.x + zone.width; x++) if(isOpaque(pixels, x, y)) return y
    }
    return zone.y
}

/**
 * Where the parts of a character drawn from a sprite lie.
 *
 * @throws {@link Error} When the sprite is all transparent, or under three rows high: it could not be cut in
 * three.
 */
export function pixelArtLayoutOf(pixels: PixelData): PixelArtLayout {
    const zone = bodyZoneOf(pixels)
    const bounds = boundsOf(pixels)!
    if(bounds.height < 3){
        throw new Error(`A character drawn from a sprite is 3 pixels high at least, this one ${bounds.height}.`)
    }
    const { width, height } = bounds
    const upper = Math.round(height / 3)
    const lower = Math.round(height * 2 / 3)
    const top = { x: 0, y: 0, width, height: upper }
    const middle = { x: 0, y: upper, width, height: lower - upper }
    const bottom = { x: 0, y: lower, width, height: height - lower }
    // The body in the canvas, and the top of its head: the first row with a pixel of the body.
    const body = { x: zone.x - bounds.x, y: zone.y - bounds.y, width: zone.width, height: zone.height }
    const headTop = firstRowOf(pixels, zone, bounds.y) - bounds.y
    const hatWidth = body.width * HAT_WIDTH
    const maskWidth = body.width * MASK_WIDTH
    const spot = itemSpotOf(pixels, zone, bounds.y + upper)
    return {
        bounds,
        width,
        height,
        top,
        middle,
        bottom,
        bendLine: lower,
        band: lower - upper,
        zone: body,
        hatPlace: {
            x: body.x + (body.width - hatWidth) / 2, y: headTop, width: hatWidth, height: upper * HAT_SHARE,
        },
        maskPlace: {
            x: body.x + (body.width - maskWidth) / 2, y: upper * MASK_FROM,
            width: maskWidth, height: upper * (MASK_TO - MASK_FROM),
        },
        // The line of the object is centered on the spot, the object being held by its middle.
        itemPlace: {
            x: spot.x - bounds.x - body.width / 2, y: spot.y - bounds.y - 0.5, width: body.width, height: 1,
        },
        accessoryPixel: body.width * ACCESSORY_PIXEL_SHARE,
    }
}

/** A part of an image, from its pixel `x, y`, as large as given. */
function cropOf(pixels: PixelData, rect: PixelRect): PixelData {
    const data = new Uint8Array(rect.width * rect.height * 4)
    for(let y = 0; y < rect.height; y++){
        const from = ((rect.y + y) * pixels.width + rect.x) * 4
        data.set(pixels.data.subarray(from, from + rect.width * 4), y * rect.width * 4)
    }
    return { width: rect.width, height: rect.height, data }
}

/**
 * The pixels of the top, of the middle and of the bottom of a character drawn from a sprite, cut at the box
 * around it. No pixel is in two parts, and none outside the box.
 */
export function cutParts(
    pixels: PixelData, layout: PixelArtLayout,
): { readonly top: PixelData, readonly middle: PixelData, readonly bottom: PixelData } {
    const { bounds } = layout
    const partOf = (part: PixelRect): PixelData => {
        return cropOf(pixels, { x: bounds.x, y: bounds.y + part.y, width: part.width, height: part.height })
    }
    return { top: partOf(layout.top), middle: partOf(layout.middle), bottom: partOf(layout.bottom) }
}
