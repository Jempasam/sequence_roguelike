import type { Color, Mat4 } from "../math"

import { Camera } from "./Camera"
import type { DrawEnvironment } from "./DrawEnvironment"
import type { DrawKey } from "./DrawKey"
import type { Geometry } from "./Geometry"
import type { Gpu } from "./Gpu"
import type { Model } from "./Model"
import type { MultiModel } from "./MultiModel"
import type { RenderTexture } from "./RenderTexture"
import type { TargetSurface } from "./TargetSurface"

/**
 * A render texture, as a target: the low resolution world before its upscale, a post-effect pass, a page
 * of atlas drawn into.
 */
export class TextureSurface implements TargetSurface {


    /** Where the texture is seen from. */
    public camera: Camera

    /**
     * @param camera - Where the texture is seen from, its texel space by default: the point `(x, y)` on the
     * texel `(x, y)`.
     */
    constructor(
        /** The GPU drawing into the texture. */
        public readonly gpu: Gpu,

        /** The texture drawn into. */
        public readonly texture: RenderTexture,

        camera = Camera.texelSpace(texture),
    ){
        this.camera = camera
    }


    public get framebuffer(): WebGLFramebuffer { return this.texture.framebuffer }

    /** The width, in texels. */
    public get width(): number { return this.texture.width }

    /** The height, in texels. */
    public get height(): number { return this.texture.height }

    public clear(color: Color, depth = false): void {
        this.gpu.clearTarget(this, color, depth, null)
    }

    public reserve(key: DrawKey, environment: DrawEnvironment, vertices: number, indices: number): Geometry {
        return this.gpu.batch.reserve(this, key, environment, vertices, indices)
    }

    public placeModel(model: Model, transform: Mat4, tint: Color, environment: DrawEnvironment): void {
        this.gpu.drawModel(this, model, transform, tint, environment)
    }

    public placeMultiModel(
        multiModel: MultiModel, transform: Mat4, tint: Color, environment: DrawEnvironment,
    ): void {
        this.gpu.drawMultiModel(this, multiModel, transform, tint, environment)
    }
}
