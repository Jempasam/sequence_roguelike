import type { OraImage } from "../../../../engine/image"

/** A rectangle of the canvas of a character, in pixels of its painting. */
export interface PnjRect {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
}

/**
 * Where the parts of a character lie on the canvas of its painting, in its pixels: what its pose bends and
 * turns, before any texture is made.
 */
export interface PnjLayout {
    /** The size of the canvas. The character stands on its bottom edge, its middle on its vertical center. */
    readonly width: number
    readonly height: number

    /** The body, its clothes colored. */
    readonly body: PnjRect

    /** The skin of the body, the hands, drawn over it with their own color. */
    readonly skin: PnjRect

    /** The head, turning on its neck. */
    readonly head: PnjRect

    /** The top of the head, which a hat barely covers. */
    readonly hatPlace: PnjRect

    /** The face, where a mask is worn, turning with the head. */
    readonly maskPlace: PnjRect

    /** Where an object is carried, moving with the body. */
    readonly itemPlace: PnjRect
}

/**
 * The names of the layers of the painting of a character, each holding one part. The painting is drawn
 * facing the viewer, its gaze to the right of the image.
 */
export const PNJ_LAYERS = {
    body: "body",
    skin: "body_skin",
    head: "head",
    hatPlace: "hat_place",
    maskPlace: "mask",
    itemPlace: "item",
} as const

/**
 * The layout of a character painted in an image of named layers, as {@link PNJ_LAYERS} names them.
 *
 * @throws {@link Error} When a layer is missing, or appears twice.
 */
export function pnjLayoutOf(image: OraImage): PnjLayout {
    const rectOf = (name: string): PnjRect => {
        const found = image.layers.filter(layer => layer.name === name)
        if(found.length !== 1){
            const names = image.layers.map(layer => layer.name).join(", ")
            throw new Error(`A character is painted with one layer "${name}", not ${found.length}. Its layers: ${names}.`)
        }
        const [{ x, y, pixels }] = found
        return { x, y, width: pixels.width, height: pixels.height }
    }
    return {
        width: image.width,
        height: image.height,
        body: rectOf(PNJ_LAYERS.body),
        skin: rectOf(PNJ_LAYERS.skin),
        head: rectOf(PNJ_LAYERS.head),
        hatPlace: rectOf(PNJ_LAYERS.hatPlace),
        maskPlace: rectOf(PNJ_LAYERS.maskPlace),
        itemPlace: rectOf(PNJ_LAYERS.itemPlace),
    }
}
