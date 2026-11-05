/**
 * The pixels of an image, the only form a texture is made from, since `texImage2D(HTMLImageElement)` does
 * not exist under Node.
 */
export interface PixelData {
    /** The width of the image, in pixels. */
    readonly width: number

    /** The height of the image, in pixels. */
    readonly height: number

    /** RGBA8, rows from top to bottom, alpha not premultiplied. */
    readonly data: Uint8Array
}
