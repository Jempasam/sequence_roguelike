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
 * The screen, at the size of the surface of the platform. In practice it mostly takes the final integer
 * upscale of a low resolution texture, and a user interface at full resolution.
 */
export class ScreenSurface implements TargetSurface {


    /**
     * Where the screen is seen from. Its pixel space by default, one world unit per pixel, `(0, 0)` on the
     * top left corner, fitted again to the new size at each resize.
     */
    public camera: Camera

    /** The screen has no framebuffer of its own. */
    public readonly framebuffer = null

    /** The screen is no texture. */
    public readonly texture: RenderTexture|null = null

    constructor(
        /** The GPU drawing on the screen. */
        public readonly gpu: Gpu,
    ){
        this.camera = Camera.pixelSpace(gpu.gfx.width, gpu.gfx.height)
        gpu.gfx.onResize((width, height) => {
            this.camera.viewSize.width = width
            this.camera.viewSize.height = height
            this.camera.position.set(Math.floor(width / 2), Math.floor(height / 2), this.camera.position.z)
        })
    }


    /** The width, in physical pixels. */
    public get width(): number { return this.gpu.gfx.width }

    /** The height, in physical pixels. */
    public get height(): number { return this.gpu.gfx.height }

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
