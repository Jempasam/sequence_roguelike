import type { PixelData } from "../image"

import type { Gpu } from "./Gpu"

/** The largest value of a byte, 1 once normalized. */
const BYTE_MAX = 255

/**
 * Pixels on the GPU, premultiplied, filtered NEAREST and clamped at the edges, as pixel art needs. Neither
 * a power of two nor mipmaps are required.
 *
 * @remarks
 * The premultiplication is done here, on the CPU, so both platforms give the same texels without relying
 * on `UNPACK_PREMULTIPLY_ALPHA_WEBGL`. Row 0 of the pixels is at `v = 0`, where a sprite starts.
 *
 * A texture changes in place, {@link Texture.write} for a zone and {@link Texture.resize} to grow it.
 * Neither invalidates a sprite or a `Model`, since their texture coordinates are in texels.
 */
export class Texture {


    /**
     * A transparent texture. WebGL initializes a new texture to zero.
     *
     * @param width - The width, in texels, up to `gpu.limits.maxTextureSize`.
     * @param height - The height, in texels, up to `gpu.limits.maxTextureSize`.
     */
    constructor(
        /** The GPU the texture lives on. */
        public readonly gpu: Gpu,

        width: number,
        height: number,
    ){
        checkSize(gpu, width, height)
        this.#width = width
        this.#height = height
        this.#handle = this.#create(width, height)
    }

    /** A texture holding an image. */
    public static fromPixels(gpu: Gpu, pixels: PixelData): Texture {
        const texture = new Texture(gpu, pixels.width, pixels.height)
        texture.#upload(0, 0, pixels)
        return texture
    }


    /** The width, in texels. */
    public get width(): number { return this.#width }

    /** The height, in texels. */
    public get height(): number { return this.#height }

    /** Was it freed? */
    public get disposed(): boolean { return this.#disposed }

    /** The WebGL texture, which a resize replaces. */
    public get handle(): WebGLTexture {
        if(this.#disposed) throw new Error("A disposed texture was used.")
        return this.#handle
    }

    /**
     * Replace a zone of texels with an image, premultiplied first.
     *
     * The pending batch is sent first when it draws with this texture, so a sprite submitted before the
     * write shows the old texels.
     *
     * @param x - The left edge of the zone, in texels.
     * @param y - The top edge of the zone, in texels.
     * @throws {@link Error} When the image does not fit in the texture at that place.
     */
    public write(x: number, y: number, pixels: PixelData): void {
        const fits = x >= 0 && y >= 0 && x + pixels.width <= this.#width && y + pixels.height <= this.#height
        if(!fits){
            throw new Error(`An image of ${pixels.width}×${pixels.height} at (${x}, ${y}) does not fit in a`
                + ` texture of ${this.#width}×${this.#height}.`)
        }
        this.gpu.batch.flushIfReads(this)
        this.#upload(x, y, pixels)
    }

    /**
     * Grow the texture, keeping its texels, copied on the GPU. The added zone is transparent.
     *
     * The pending batch is sent first when it draws with this texture.
     *
     * @throws {@link Error} When the texture would shrink, or exceed `gpu.limits.maxTextureSize`.
     */
    public resize(width: number, height: number): void {
        if(width < this.#width || height < this.#height){
            throw new Error(`A texture only grows, not from ${this.#width}×${this.#height} to ${width}×${height}.`)
        }
        checkSize(this.gpu, width, height)
        this.gpu.batch.flushIfReads(this)
        const { gl, state } = this.gpu
        const old = this.handle
        const grown = this.#create(width, height)
        const framebuffer = gl.createFramebuffer()
        state.framebuffer(framebuffer, this.#width, this.#height)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, old, 0)
        state.texture(0, grown)
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.#width, this.#height)
        gl.deleteFramebuffer(framebuffer)
        state.forgetFramebuffer(framebuffer)
        gl.deleteTexture(old)
        this.#handle = grown
        this.#width = width
        this.#height = height
    }

    /** Free the texture. Drawing with it afterwards throws. Disposing twice does nothing. */
    public dispose(): void {
        if(this.#disposed) return
        this.gpu.batch.flushIfReads(this)
        this.gpu.gl.deleteTexture(this.#handle)
        this.#disposed = true
    }


    //// Storage ////

    /**
     * Give the texture new storage of a size, its texels lost. Only a texture whose content is drawn again
     * each frame, the depth of a render texture, is resized this way.
     */
    protected reallocate(width: number, height: number): void {
        checkSize(this.gpu, width, height)
        this.gpu.gl.deleteTexture(this.handle)
        this.#handle = this.#create(width, height)
        this.#width = width
        this.#height = height
    }

    /** Allocate the storage of the bound texture, empty. A depth texture allocates its own format. */
    protected allocate(width: number, height: number): void {
        const gl = this.gpu.gl
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    }


    #width: number
    #height: number
    #handle: WebGLTexture
    #disposed = false

    #create(width: number, height: number): WebGLTexture {
        const { gl, state } = this.gpu
        const texture = gl.createTexture()
        state.texture(0, texture)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        this.allocate(width, height)
        return texture
    }

    #upload(x: number, y: number, pixels: PixelData): void {
        const gl = this.gpu.gl
        this.gpu.state.texture(0, this.handle)
        gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, pixels.width, pixels.height, gl.RGBA, gl.UNSIGNED_BYTE,
            premultiplied(pixels.data))
    }
}

/** The texels of an image, alpha premultiplied, rounded to the nearest byte. */
export function premultiplied(data: Uint8Array): Uint8Array {
    const out = new Uint8Array(data.length)
    for(let i = 0; i < data.length; i += 4){
        const alpha = data[i + 3]
        out[i] = Math.round(data[i] * alpha / BYTE_MAX)
        out[i + 1] = Math.round(data[i + 1] * alpha / BYTE_MAX)
        out[i + 2] = Math.round(data[i + 2] * alpha / BYTE_MAX)
        out[i + 3] = alpha
    }
    return out
}

function checkSize(gpu: Gpu, width: number, height: number): void {
    const max = gpu.limits.maxTextureSize
    const isValid = Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0
    if(!isValid || width > max || height > max){
        throw new Error(`A texture of ${width}×${height} is not possible: its sides are whole, from 1 to ${max}.`)
    }
}
