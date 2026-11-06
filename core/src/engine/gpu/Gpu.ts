import { Color, Mat4 } from "../math"
import type { GfxPort } from "../../platform"

import { Batch } from "./Batch"
import type { DrawEnvironment } from "./DrawEnvironment"
import type { ColorMode, DrawKey } from "./DrawKey"
import { GlState } from "./GlState"
import { Material } from "./Material"
import type { Model } from "./Model"
import type { MultiModel } from "./MultiModel"
import { Shader, STANDARD_SHADE } from "./Shader"
import { Sprite } from "./Sprite"
import { checkSources, viewProjectionOf } from "./TargetSurface"
import type { TargetSurface } from "./TargetSurface"
import { Texture } from "./Texture"

/** The value of `uColorMode` for each color mode, as the fragment stage of the shaders reads it. */
const COLOR_MODE_VALUES: Readonly<Record<ColorMode, number>> = { modulate: 0, colorize: 1, hue: 2, mask: 3 }

/** What the GPU allows, read once at startup. */
export interface GpuLimits {
    /** The longest side of a texture, in texels. */
    readonly maxTextureSize: number

    /** How many textures one draw reads at most: the texture of the draw and those of its material. */
    readonly maxTextureUnits: number

    /** The thinnest and thickest `LINES`, in pixels. Often both 1, on ANGLE notably. */
    readonly lineWidths: readonly [number, number]

    /** The smallest and largest `POINTS`, in pixels. */
    readonly pointSizes: readonly [number, number]
}

/**
 * The WebGL context of the game, and the only part of it that calls `gl.*`. Built once by `game` from the
 * `GfxPort` of the platform, then injected: there is no singleton, since a host and a client can live in
 * the same process, and the host builds none.
 *
 * @remarks
 * It reads the extensions, the limits, keeps the cache of the GL state, the batch shared by every surface,
 * a white texture for the shapes, and the standard shader.
 *
 * It does not present the frame: the frame loop of `game` calls {@link Gpu.flush}, then `present()` on
 * the port, so a frame drawing into textures never shows a screen half drawn.
 *
 * `gl`, `state` and `batch` serve the classes of `engine/gpu`. Drawing through them from outside would
 * leave the cache believing a stale state.
 */
export class Gpu {


    /** The context. Only the classes of `engine/gpu` use it. */
    public readonly gl: WebGLRenderingContext

    /** The surface of the platform, for the screen. */
    public readonly gfx: GfxPort

    /** The cache of the GL state. Only the classes of `engine/gpu` use it. */
    public readonly state: GlState

    /** The readable depth textures, none when the GPU lacks them: a `RenderTexture` with them then throws. */
    public readonly depthTextures: WEBGL_depth_texture|null

    public readonly limits: GpuLimits

    /** A white texel, which the shapes are drawn with by default. */
    public readonly white: Sprite

    /** The shader drawing the texel as it is. */
    public readonly standardShader: Shader

    /** The material of the standard shader, the one a painter starts with. */
    public readonly standardMaterial: Material

    /** The draws not yet sent. Only the classes of `engine/gpu` use it. */
    public readonly batch: Batch

    /**
     * @throws {@link Error} When the processor is big-endian, or the GPU lacks `OES_vertex_array_object`.
     */
    constructor(gfx: GfxPort){
        if(new Uint8Array(Uint32Array.of(1).buffer)[0] !== 1){
            throw new Error("The engine writes colors as little-endian words, and this processor is big-endian.")
        }
        const gl = gfx.gl
        this.gl = gl
        this.gfx = gfx
        const vertexArrays = gl.getExtension("OES_vertex_array_object")
        if(!vertexArrays) throw new Error("The GPU lacks OES_vertex_array_object, which the engine requires.")
        this.state = new GlState(gl, vertexArrays)
        this.depthTextures = gl.getExtension("WEBGL_depth_texture")
        this.limits = {
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
            maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number,
            lineWidths: rangeOf(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)),
            pointSizes: rangeOf(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)),
        }
        // The engine premultiplies on the CPU, and row 0 of an image is row 0 of its texture.
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
        const white = { width: 1, height: 1, data: Uint8Array.of(255, 255, 255, 255) }
        this.white = Sprite.whole(Texture.fromPixels(this, white))
        this.standardShader = Shader.fragment(this, STANDARD_SHADE)
        this.standardMaterial = new Material(this.standardShader)
        this.batch = new Batch(this)
    }


    //// Frame ////

    /**
     * Send every pending draw to the GPU, at the end of a frame, before `present()`.
     *
     * @throws {@link Error} When a painter pushed more states than it popped.
     */
    public flush(): void {
        if(this.#openPushes !== 0){
            const count = this.#openPushes
            this.#openPushes = 0
            throw new Error(`Painters pushed ${count} more states than they popped. Pair every push() with a pop().`)
        }
        this.batch.flush()
    }

    /** Free what the GPU holds for the engine itself: the batch, the white texture, the standard shader. */
    public dispose(): void {
        this.batch.flush()
        this.batch.dispose()
        this.white.texture.dispose()
        this.standardShader.dispose()
    }

    /** Count a state pushed by a painter, which a pop pays back. */
    public notePush(): void {
        this.#openPushes++
    }

    /** Count a state popped by a painter. */
    public notePop(): void {
        this.#openPushes--
    }


    //// Drawing ////

    /** Clear a target, within a clip when the environment has one. */
    public clearTarget(
        target: TargetSurface, color: Color, depth: boolean, environment: DrawEnvironment|null,
    ): void {
        this.batch.flush()
        const { gl, state } = this
        state.framebuffer(target.framebuffer, target.width, target.height)
        state.scissor(environment)
        gl.clearColor(color.r * color.a, color.g * color.a, color.b * color.a, color.a)
        if(depth) state.depthWrite(true)
        gl.clear(gl.COLOR_BUFFER_BIT | (depth ? gl.DEPTH_BUFFER_BIT : 0))
    }

    /** Draw a model into a target, moved and tinted by uniforms, after the pending batch. */
    public drawModel(
        target: TargetSurface, model: Model, transform: Mat4, tint: Color, environment: DrawEnvironment,
    ): void {
        this.batch.flush()
        if(model.disposed) throw new Error("A disposed Model was drawn. A MultiModel may still place it.")
        checkSources(target, model.key)
        viewProjectionOf(target, this.#viewProjection)
        this.#tint[3] = tint.a
        this.#tint[0] = tint.r * tint.a
        this.#tint[1] = tint.g * tint.a
        this.#tint[2] = tint.b * tint.a
        this.drawRun(target, this.#viewProjection, model.key, environment, model.mesh.vertexArray,
            model.primitive.glId, model.indices.length, transform, this.#tint)
    }

    /**
     * Draw each placement of a multi-model into a target, the transform and the tint composed with its own.
     */
    public drawMultiModel(
        target: TargetSurface, multiModel: MultiModel, transform: Mat4, tint: Color,
        environment: DrawEnvironment,
    ): void {
        for(const placement of multiModel.placements){
            this.#placementTransform.setProduct(transform, placement.transform)
            this.#placementTint.copyFrom(tint).multiply(placement.tint)
            const { model } = placement
            this.drawModel(target, model, this.#placementTransform, this.#placementTint, environment)
        }
    }

    /**
     * Make one draw call: bind the target, the program, the uniforms of the contract and of the material,
     * the textures and the GL state of the key and the environment, then draw the indices of a vertex array.
     *
     * @param tint - The tint, premultiplied, as four floats.
     */
    public drawRun(
        target: TargetSurface, viewProjection: Mat4, key: DrawKey, environment: DrawEnvironment,
        vertexArray: WebGLVertexArrayObjectOES, primitive: number, count: number, transform: Mat4,
        tint: Float32Array,
    ): void {
        const { gl, state } = this
        const material = key.material
        const shader = material.shader
        state.framebuffer(target.framebuffer, target.width, target.height)
        state.program(shader.program)
        gl.uniformMatrix4fv(shader.standardLocation("uModel"), false, transform.elements)
        gl.uniformMatrix4fv(shader.standardLocation("uViewProjection"), false, viewProjection.elements)
        gl.uniform2f(shader.standardLocation("uTargetSize"), target.width, target.height)
        gl.uniform2f(shader.standardLocation("uTextureSize"), key.texture.width, key.texture.height)
        gl.uniform1f(shader.standardLocation("uColorMode"), COLOR_MODE_VALUES[key.colorMode])
        gl.uniform1f(shader.standardLocation("uCutout"), key.blend === "cutout" ? 1 : 0)
        gl.uniform4fv(shader.standardLocation("uTint"), tint)
        gl.uniform4f(shader.standardLocation("uColorize"), environment.colorizeR, environment.colorizeG, environment.colorizeB,
            environment.colorizeIntensity)
        gl.uniform3f(shader.standardLocation("uLight"), environment.lightR, environment.lightG, environment.lightB)
        gl.uniform1f(shader.standardLocation("uPointSize"), clamp(environment.pointSize, this.limits.pointSizes))
        material.apply()
        state.texture(0, key.texture.handle)
        state.blend(key.blend)
        state.depthTest(key.depthTest)
        state.depthWrite(key.blend === "cutout")
        state.scissor(environment)
        state.lineWidth(clamp(environment.lineWidth, this.limits.lineWidths))
        state.vertexArray(vertexArray)
        gl.drawElements(primitive, count, gl.UNSIGNED_SHORT, 0)
    }


    #openPushes = 0
    readonly #viewProjection = new Mat4()
    readonly #tint = new Float32Array(4)
    readonly #placementTransform = new Mat4()
    readonly #placementTint = new Color()
}

function rangeOf(value: unknown): readonly [number, number] {
    const range = value as ArrayLike<number>|null
    if(!range || range.length < 2) return [1, 1]
    return [range[0], range[1]]
}

function clamp(value: number, [min, max]: readonly [number, number]): number {
    return Math.min(Math.max(value, min), max)
}
