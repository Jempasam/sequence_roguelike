import type { OraImage, OraLayer } from "../../image"

/** Where a picture of a transition stands at a frame, against its place in the painting. */
export interface TransitionFrame {
    /** How far it is moved from its place, in widths of the space for x and heights for y. */
    readonly x: number
    readonly y: number

    /** How large it is against its size in the painting, around its center. */
    readonly scale: number

    /** How opaque it is drawn, from 0 to 1, multiplying the opacity of its layer. */
    readonly opacity: number
}

/** A picture of a transition: a layer of its painting, and where it stands at each frame. */
export interface TransitionPicture {
    /** The name of its layer, its frames left out. */
    readonly name: string

    readonly layer: OraLayer

    /** Its place and size in the painting, from 0 to 1 of the space on each axis. */
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number

    /** Its frames, as many as those of every other picture of the transition. */
    readonly frames: readonly TransitionFrame[]
}

/** A transition read from a painting: pictures laid over one another, all moved through the same frames. */
export interface TransitionScript {
    /** The width of the space against its height. */
    readonly aspect: number

    /** The pictures, the bottom one first, as they are drawn. */
    readonly pictures: readonly TransitionPicture[]

    /** How many frames each picture goes through, at least 2. */
    readonly frameCount: number

    /** When the middle of the transition comes, from 0 at its start to 1 at its end. */
    readonly middle: number
}

/** The token of a layer name marking the middle of the transition. */
const MIDDLE = "m"

/**
 * Read a transition from a painting of layers, each named `<name> <frame> <frame> …`, where a frame is
 * `x;y`, `x;y;z` or `x;y;z;a`:
 * - `x;y`: how far the layer is moved from where it is painted, in widths and heights of the canvas;
 * - `z`: how large it is against its size in the painting, around its center, 1 when not given;
 * - `a`: how opaque it is, from 0 to 1, multiplying the opacity of the layer, 1 when not given.
 *
 * The frames are evenly spaced in time. An `m` between two frames marks the middle at the frame before
 * it; layers marking it mark it at the same frame. Without one, the middle is halfway. Hidden layers are
 * left out.
 *
 * @param name - The name of the painting, only used in error messages.
 * @throws {@link Error} When a layer name is not of that form, or the layers disagree on their frames.
 */
export function readTransition(image: OraImage, name: string): TransitionScript {
    if(image.width <= 0 || image.height <= 0) throw new Error(`The transition ${name} has an empty canvas.`)
    const read = image.layers.filter(layer => layer.visible).map(layer => pictureOf(layer, image, name))
    if(read.length === 0) throw new Error(`The transition ${name} has no visible layer.`)
    const frameCount = read[0].picture.frames.length
    for(const { picture } of read){
        if(picture.frames.length !== frameCount){
            throw new Error(`In the transition ${name}, the layer "${picture.name}" has`
                + ` ${picture.frames.length} frames and "${read[0].picture.name}" ${frameCount}:`
                + " every layer goes through as many.")
        }
    }
    let middle: { at: number, by: string }|null = null
    for(const { picture, middleAt } of read){
        if(middleAt === null) continue
        if(middle && middle.at !== middleAt){
            throw new Error(`In the transition ${name}, the layers "${middle.by}" and "${picture.name}" mark`
                + " the middle (m) after different frames.")
        }
        middle = { at: middleAt, by: picture.name }
    }
    return {
        aspect: image.width / image.height,
        pictures: read.map(each => each.picture).reverse(),
        frameCount,
        middle: middle ? middle.at / (frameCount - 1) : 0.5,
    }
}


//// Parts ////

/** A picture read from its layer, and the frame the middle comes at, none when it marks none. */
interface ReadPicture {
    readonly picture: TransitionPicture
    readonly middleAt: number|null
}

function pictureOf(layer: OraLayer, image: OraImage, name: string): ReadPicture {
    const [title = "", ...tokens] = layer.name.split(/\s+/).filter(token => token !== "")
    const where = `In the transition ${name}, the layer "${layer.name}"`
    const frames: TransitionFrame[] = []
    let middleAt: number|null = null
    for(const token of tokens){
        if(token === MIDDLE){
            if(frames.length === 0) throw new Error(`${where} marks the middle (m) before its first frame.`)
            if(middleAt !== null) throw new Error(`${where} marks the middle (m) twice.`)
            middleAt = frames.length - 1
        } else {
            frames.push(frameOf(token, where))
        }
    }
    if(frames.length < 2){
        throw new Error(`${where} has ${frames.length} frames, not at least 2:`
            + " it is named \"<name> x;y x;y …\", a frame being x;y, x;y;z or x;y;z;a.")
    }
    return {
        picture: {
            name: title,
            layer,
            x: layer.x / image.width,
            y: layer.y / image.height,
            width: layer.pixels.width / image.width,
            height: layer.pixels.height / image.height,
            frames,
        },
        middleAt,
    }
}

/** A frame read from its token, `x;y`, `x;y;z` or `x;y;z;a`. */
function frameOf(token: string, where: string): TransitionFrame {
    const parts = token.split(";")
    const values = parts.map(part => part.trim() === "" ? NaN : Number(part))
    if(parts.length < 2 || parts.length > 4 || !values.every(Number.isFinite)){
        throw new Error(`${where} has the frame "${token}", not x;y, x;y;z or x;y;z;a in numbers.`)
    }
    const [x, y, scale = 1, opacity = 1] = values
    if(scale < 0) throw new Error(`${where} has the frame "${token}", whose size ${scale} is below 0.`)
    if(opacity < 0 || opacity > 1){
        throw new Error(`${where} has the frame "${token}", whose opacity ${opacity} is not from 0 to 1.`)
    }
    return { x, y, scale, opacity }
}
