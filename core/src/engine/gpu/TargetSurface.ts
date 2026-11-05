import type { Color, Mat4 } from "../math"

import type { Camera } from "./Camera"
import type { DrawKey } from "./DrawKey"
import type { RenderTexture } from "./RenderTexture"
import type { Surface } from "./Surface"

/**
 * A surface backed by a framebuffer: it projects through a camera and can be cleared.
 *
 * @remarks
 * A target never reads its own texture, not even through a `Model`, a `MultiModel` or the textures of a
 * material, its depth texture included: that would be a feedback loop, a GL error. Drawing so throws.
 */
export interface TargetSurface extends Surface {
    /** Where the target is seen from. Read at each draw, so it can move between two of them. */
    camera: Camera

    /** The width, in pixels. */
    readonly width: number

    /** The height, in pixels. */
    readonly height: number

    /** The framebuffer drawn into, none for the screen. */
    readonly framebuffer: WebGLFramebuffer|null

    /** The texture drawn into, none for the screen. */
    readonly texture: RenderTexture|null

    /**
     * Clear the whole target to a color, and its depth when asked. A painter clears within its clip
     * instead, with `Painter.clear`.
     */
    clear(color: Color, depth?: boolean): void
}

/** Is the surface a target, with a camera, rather than a recording? */
export function isTargetSurface(surface: Surface): surface is TargetSurface {
    return "camera" in surface
}

/**
 * Write the projection of a target. A texture flips it, as its framebuffer has its rows bottom up, so its
 * row 0 is at `y = 0` as in every other texture.
 */
export function viewProjectionOf(target: TargetSurface, out: Mat4): Mat4 {
    target.camera.viewProjectionInto(out)
    if(target.texture){
        const e = out.elements
        for(let column = 0; column < 4; column++) e[column * 4 + 1] = -e[column * 4 + 1]
    }
    return out
}

/**
 * Refuse a draw reading the texture its target draws into.
 *
 * @throws {@link Error} When the draw would read the texture of its target, or the depth texture of it.
 */
export function checkSources(target: TargetSurface, key: DrawKey): void {
    const own = target.texture
    if(!own) return
    const readsOwn = key.reads(own) || (own.depthTexture !== null && key.reads(own.depthTexture))
    if(readsOwn){
        throw new Error("A texture surface was drawn with its own texture, a feedback loop. Draw it into"
            + " another render texture, and alternate between the two.")
    }
}
