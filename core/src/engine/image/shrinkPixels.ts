import type { PixelData } from "./PixelData"

/**
 * An image made a whole number of times smaller, each pixel the average of the square of pixels it
 * replaces, so a painting far larger than the screen keeps its details instead of the aliasing a NEAREST
 * texture gives when drawn smaller. The colors are averaged by their alpha, so the color of transparent
 * pixels does not bleed into the edges.
 *
 * The squares at the right and bottom edges are cut by the image: the size is rounded up.
 *
 * @param factor - How many times smaller, a whole number from 1, which returns the image as it is.
 * @throws {@link Error} When the factor is not a whole number from 1.
 */
export function shrinkPixels(pixels: PixelData, factor: number): PixelData {
    if(!Number.isInteger(factor) || factor < 1) throw new Error(`An image shrinks by a whole factor from 1, not ${factor}.`)
    if(factor === 1) return pixels
    const { width, height, data } = pixels
    const shrunkWidth = Math.ceil(width / factor)
    const shrunkHeight = Math.ceil(height / factor)
    const shrunk = new Uint8Array(shrunkWidth * shrunkHeight * 4)
    const area = factor * factor
    for(let y = 0; y < shrunkHeight; y++){
        for(let x = 0; x < shrunkWidth; x++){
            let r = 0
            let g = 0
            let b = 0
            let a = 0
            const bottom = Math.min(height, (y + 1) * factor)
            const right = Math.min(width, (x + 1) * factor)
            for(let sy = y * factor; sy < bottom; sy++){
                for(let sx = x * factor; sx < right; sx++){
                    const at = (sy * width + sx) * 4
                    const alpha = data[at + 3]
                    r += data[at] * alpha
                    g += data[at + 1] * alpha
                    b += data[at + 2] * alpha
                    a += alpha
                }
            }
            if(a === 0) continue
            const out = (y * shrunkWidth + x) * 4
            shrunk[out] = Math.round(r / a)
            shrunk[out + 1] = Math.round(g / a)
            shrunk[out + 2] = Math.round(b / a)
            shrunk[out + 3] = Math.round(a / area)
        }
    }
    return { width: shrunkWidth, height: shrunkHeight, data: shrunk }
}
