import type { Gpu } from "./Gpu"
import { Sprite } from "./Sprite"
import { Texture } from "./Texture"

/**
 * The depth a render texture keeps:
 * - `"none"`: no depth, every draw passes the depth test.
 * - `"renderbuffer"`: a 16-bit depth for the depth test, which nothing reads.
 * - `"texture"`: a depth a material reads, `depthTexture`, its value in the red channel from 0 to 1. It
 *   requires `WEBGL_depth_texture`. Seen from above, where `z` follows `y`, it mostly holds the height on
 *   the screen: only an effect really needing it takes one.
 */
export type DepthBuffer = "none"|"renderbuffer"|"texture"

/** How a render texture is made. */
export interface RenderTextureOptions {
    /** The depth it keeps, none by default. */
    readonly depth?: DepthBuffer
}

/**
 * A texture that can be drawn into, through a `TextureSurface`, and drawn with, as any texture.
 *
 * @remarks
 * Growing it with {@link Texture.resize} keeps its texels and attaches its framebuffer and depth to the
 * new size. The depth itself is lost, as it is cleared with each frame drawn into it.
 */
export class RenderTexture extends Texture {


    /** The depth it keeps. */
    public readonly depth: DepthBuffer

    /** Its depth as a texture a material reads, none unless {@link RenderTexture.depth} is `"texture"`. */
    public readonly depthTexture: Texture|null

    /**
     * A transparent render texture.
     *
     * @throws {@link Error} When a readable depth is asked of a GPU without `WEBGL_depth_texture`, or the GPU
     * cannot draw into this framebuffer.
     */
    constructor(gpu: Gpu, width: number, height: number, options: RenderTextureOptions = {}){
        super(gpu, width, height)
        this.depth = options.depth ?? "none"
        if(this.depth === "texture" && !gpu.depthTextures){
            throw new Error("A render texture with a readable depth needs WEBGL_depth_texture, which the GPU lacks.")
        }
        const gl = gpu.gl
        const framebuffer = gl.createFramebuffer()
        if(!framebuffer) throw new Error("WebGL could not create a framebuffer, likely because the context was lost.")
        this.#framebuffer = framebuffer
        this.#renderbuffer = this.depth === "renderbuffer" ? gl.createRenderbuffer() : null
        this.depthTexture = this.depth === "texture" ? new DepthTexture(gpu, width, height) : null
        this.#attach()
    }


    /** The framebuffer drawing into it. */
    public get framebuffer(): WebGLFramebuffer {
        if(this.disposed) throw new Error("A disposed render texture was drawn into.")
        return this.#framebuffer
    }

    /** The sprite of the whole texture, the way it is almost always drawn. */
    public get sprite(): Sprite {
        const isCurrent = this.#sprite?.width === this.width && this.#sprite.height === this.height
        if(!this.#sprite || !isCurrent) this.#sprite = Sprite.whole(this)
        return this.#sprite
    }

    public override resize(width: number, height: number): void {
        super.resize(width, height)
        if(this.depthTexture instanceof DepthTexture) this.depthTexture.follow(width, height)
        this.#attach()
    }

    /** Free the texture, its framebuffer and its depth. Disposing twice does nothing. */
    public override dispose(): void {
        if(this.disposed) return
        // Sent whatever it holds, since the pending batch may be drawing into this texture.
        this.gpu.batch.flush()
        super.dispose()
        const gl = this.gpu.gl
        gl.deleteFramebuffer(this.#framebuffer)
        this.gpu.state.forgetFramebuffer(this.#framebuffer)
        if(this.#renderbuffer) gl.deleteRenderbuffer(this.#renderbuffer)
        this.depthTexture?.dispose()
    }


    readonly #framebuffer: WebGLFramebuffer
    readonly #renderbuffer: WebGLRenderbuffer|null
    #sprite: Sprite|null = null

    /** Attach the texture and the depth to the framebuffer, at their current size. */
    #attach(): void {
        const { gl, state } = this.gpu
        state.framebuffer(this.#framebuffer, this.width, this.height)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.handle, 0)
        if(this.#renderbuffer){
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.#renderbuffer)
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height)
            const renderbuffer = this.#renderbuffer
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer)
            gl.bindRenderbuffer(gl.RENDERBUFFER, null)
        }
        if(this.depthTexture){
            const depth = this.depthTexture.handle
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0)
        }
        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
        if(status !== gl.FRAMEBUFFER_COMPLETE){
            throw new Error(`The GPU cannot draw into a render texture of ${this.width}×${this.height} with depth`
                + ` "${this.depth}": its framebuffer is incomplete, status 0x${status.toString(16)}.`)
        }
    }
}

/**
 * The depth of a render texture, as a texture a material reads. It follows the size of its render texture.
 */
class DepthTexture extends Texture {


    public override write(): void {
        throw new Error("A depth texture is drawn by its render texture, not written.")
    }

    public override resize(): void {
        throw new Error("A depth texture follows the size of its render texture, which is the one resized.")
    }

    /** Take the size of its render texture, its depth lost. */
    public follow(width: number, height: number): void {
        this.reallocate(width, height)
    }

    protected override allocate(width: number, height: number): void {
        const gl = this.gpu.gl
        const format = gl.DEPTH_COMPONENT
        gl.texImage2D(gl.TEXTURE_2D, 0, format, width, height, 0, format, gl.UNSIGNED_SHORT, null)
    }
}
