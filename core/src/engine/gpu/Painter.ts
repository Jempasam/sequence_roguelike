import { Color, Mat4, Vec3 } from "../math"

import { DrawEnvironment } from "./DrawEnvironment"
import { blendStateOf, DrawKey } from "./DrawKey"
import type { BlendMode, ColorMode, DepthTest } from "./DrawKey"
import { checkData, MAX_VERTICES, packColor, RAW_VERTEX_SIZE } from "./Geometry"
import type { Geometry } from "./Geometry"
import type { Gpu } from "./Gpu"
import { listIndices } from "./listIndices"
import type { Material } from "./Material"
import type { Model } from "./Model"
import type { MultiModel } from "./MultiModel"
import { Primitive } from "./Primitive"
import type { Sprite } from "./Sprite"
import type { Surface } from "./Surface"
import { isTargetSurface, viewProjectionOf } from "./TargetSurface"
import type { TargetSurface } from "./TargetSurface"
import {
    arcShape, curveSegmentsOf, multiLineShape, polygonShape, rectShape, Shape, thickLineShape, triangleShape,
} from "./Tessellation"
import type { Point } from "./Tessellation"
import type { Texture } from "./Texture"

/** How far a corner of a clip may stray from a straight rectangle, in pixels, before it counts as turned. */
const CLIP_TOLERANCE = 1e-3

/** The indices of a quad, two triangles over its corners in order. */
const QUAD_INDICES = [0, 1, 2, 0, 2, 3] as const

/** How a painter is set up beyond its GPU and surface. */
export interface PainterOptions {
    /**
     * The blend modes it accepts, every one when none. A painter on a transparent texture refuses
     * `"multiply"`, which gives black there.
     */
    readonly blends?: readonly BlendMode[]|null
}

/** The zone the vertices of some draws reached, in coordinates of the target. */
export interface Reach {
    readonly left: number
    readonly top: number
    readonly right: number
    readonly bottom: number
}

/**
 * Draws on a surface, through a stack of states, as Canvas 2D does, but in 3D with a camera, with custom
 * shaders, into textures, and into recordings replayed later.
 *
 * @remarks
 * The state has three families, by what a `Model` recorded yesterday replays: the vertices (transform,
 * tint, data, the alpha a blend writes) are baked in its geometry, the key (material, blend, color mode,
 * depth test) is the one it was recorded with, and the environment (clip, light, colorization, line width,
 * point size) is the current one.
 *
 * The transform applies on the CPU, so thousands of sprites with different transforms fit in one call.
 * Only `model` and `multiModel` pass theirs as a uniform, or prebaking would be pointless.
 *
 * Positions are not rounded: a moving object at a fractional position shimmers from frame to frame in a
 * low resolution texture, and only the game knows what has to stay sharp.
 *
 * One painter per use: the frame, the baking of a `Model`, the user interface. A bake in the middle of a
 * frame takes a new painter, so it starts from a default environment as a recording requires, and leaves
 * the state of the frame alone. A painter costs its stack and its working key, nothing on the GPU.
 *
 * Every `push` takes a `pop`: an unbalanced stack throws at `gpu.flush()`.
 */
export class Painter {


    constructor(
        /** The GPU the painter draws through. */
        public readonly gpu: Gpu,

        surface: Surface,

        options: PainterOptions = {},
    ){
        this.#surface = surface
        this.#blends = options.blends ?? null
        this.#state = new PainterState(gpu)
        this.#key = new DrawKey(gpu.white.texture, gpu.standardMaterial, Primitive.TRIANGLES)
    }


    /** Where the vertices go. */
    public get surface(): Surface { return this.#surface }

    /** Draw on another surface, keeping the state: the camera follows the surface, the light stays. */
    public setTarget(surface: Surface): void {
        this.#surface = surface
    }


    //// State ////

    /** Multiply the color of what is drawn next, alpha included. */
    public setTint(tint: Color): void {
        this.#state.tint.copyFrom(tint)
    }

    /**
     * Give the values of `aData` of what is drawn next, read by a shader with a data layout. A value the
     * layout cannot hold throws at the draw: any value for a shader reading none, outside 0 to 1 in bytes.
     */
    public setData(d0: number, d1 = 0, d2 = 0, d3 = 0): void {
        const state = this.#state
        state.d0 = d0
        state.d1 = d1
        state.d2 = d2
        state.d3 = d3
    }

    /**
     * Draw with a shader and its values. Changing the material from one sprite to the next breaks the batch.
     */
    public setMaterial(material: Material): void {
        this.#state.material = material
    }

    /**
     * @throws {@link Error} When the painter does not accept this blend mode.
     */
    public setBlend(blend: BlendMode): void {
        if(this.#blends && !this.#blends.includes(blend)){
            throw new Error(`This painter accepts the blends ${this.#blends.join(", ")}, not "${blend}".`)
        }
        this.#state.blend = blend
    }

    /** Multiply by the color of the vertices, shade it by the luminance, take its hue, or take only the opacity of the texture: see `ColorMode`. */
    public setColorMode(colorMode: ColorMode): void {
        this.#state.colorMode = colorMode
    }

    public setDepthTest(depthTest: DepthTest): void {
        this.#state.depthTest = depthTest
    }

    /**
     * Light what is drawn next, multiplying its color last. A state of a pass, not of a sprite: it breaks the
     * batch, and an effect by sprite goes through `aData`.
     *
     * @param r - The light, in floats that may exceed 1 to brighten.
     */
    public setLight(r: number, g: number, b: number): void {
        this.#state.environment.setLight(r, g, b)
    }

    /**
     * Mix the color of what is drawn next towards its luminance times a color, just before the light: a
     * world in grey for a ghost, a frozen monster. It flattens hues of equal luminance into one color,
     * never brightens past the color, and touches the whole sprite, eyes included: it is for states, and
     * the variants of a monster go through a palette swap in `aData`. A state of a pass, it breaks the batch.
     *
     * @param intensity - How much of it applies, from 0, none, to 1.
     */
    public setColorize(r: number, g: number, b: number, intensity: number): void {
        this.#state.environment.setColorize(r, g, b, intensity)
    }

    /**
     * Give `LINES` a thickness, in pixels of the target, not following the transform. A debug primitive:
     * `gl.lineWidth` is often stuck at 1, and the GPU clamps it to `gpu.limits.lineWidths`. A real line is a
     * `thickLine` or a `multiLine`.
     */
    public setLineWidth(width: number): void {
        this.#state.environment.setLineWidth(width)
    }

    /**
     * Give `POINTS` a size, in pixels of the target, not following the transform. A debug primitive, clamped
     * to `gpu.limits.pointSizes`. A real point is a `circle`, a `triangle` or a `rect`.
     */
    public setPointSize(size: number): void {
        this.#state.environment.setPointSize(size)
    }

    /**
     * Draw the shapes with white texels of another texture, so shapes and sprites of an atlas holding them
     * share a batch. The shapes read the texels at the center of the region.
     *
     * @throws {@link Error} When the region is smaller than 2 by 2 without being a whole texture: its center
     * would lie on the edge of the texels around it.
     */
    public setWhitePixel(sprite: Sprite): void {
        const isWhole = sprite.width === sprite.texture.width && sprite.height === sprite.texture.height
        if(!isWhole && (sprite.width < 2 || sprite.height < 2)){
            throw new Error("The white pixel of the shapes is 2 by 2 texels at least, or a whole texture.")
        }
        this.#state.white = sprite
    }

    /** Save the whole state, as `save()` in Canvas 2D. */
    public push(): void {
        const saved = this.#stack[this.#depth] ?? new PainterState(this.gpu)
        this.#stack[this.#depth] = saved
        saved.copyFrom(this.#state)
        this.#depth++
        this.gpu.notePush()
    }

    /**
     * Restore the state last saved, as `restore()` in Canvas 2D.
     *
     * @throws {@link Error} When nothing was saved.
     */
    public pop(): void {
        if(this.#depth === 0) throw new Error("A painter popped more states than it pushed.")
        this.#depth--
        this.#state.copyFrom(this.#stack[this.#depth])
        this.gpu.notePop()
    }


    //// Transform and clip ////

    /** Move the origin of what is drawn next. */
    public translate(x: number, y: number, z = 0): void {
        this.#state.transform.translate(x, y, z)
    }

    /** Turn what is drawn next around the origin, clockwise since `y` is down. */
    public rotate(angle: number): void {
        this.#state.transform.rotateZ(angle)
    }

    public scale(x: number, y = x): void {
        this.#state.transform.scale(x, y)
    }

    /** Apply an affine matrix before the current transform. */
    public transform(matrix: Mat4): void {
        this.#state.transform.multiply(matrix)
    }

    /**
     * Cut the clip by a rectangle in local coordinates, so nothing is drawn outside both. It is kept in
     * pixels of the current target.
     *
     * @throws {@link Error} When the surface is a recording, or the transform turns the rectangle: a scissor
     * is a straight rectangle.
     */
    public clip(x: number, y: number, width: number, height: number): void {
        const target = this.#target("clip")
        const projection = viewProjectionOf(target, this.#clipMatrix)
        const m = this.#clipMatrix.setProduct(projection, this.#state.transform)
        const corners = this.#corners
        windowPointOf(m, x, y, target, corners, 0)
        windowPointOf(m, x + width, y, target, corners, 2)
        windowPointOf(m, x + width, y + height, target, corners, 4)
        windowPointOf(m, x, y + height, target, corners, 6)
        const near = (a: number, b: number) => Math.abs(corners[a] - corners[b]) < CLIP_TOLERANCE
        const isStraight = near(0, 6) && near(2, 4) && near(1, 3) && near(7, 5)
        const isQuarterTurned = near(1, 7) && near(3, 5) && near(0, 2) && near(6, 4)
        if(!isStraight && !isQuarterTurned) throw new Error("A clip was set under a transform that turns it.")
        let left = Math.round(Math.min(corners[0], corners[2], corners[4]))
        let right = Math.round(Math.max(corners[0], corners[2], corners[4]))
        let bottom = Math.round(Math.min(corners[1], corners[3], corners[5]))
        let top = Math.round(Math.max(corners[1], corners[3], corners[5]))
        const environment = this.#state.environment
        if(environment.hasClip){
            left = Math.max(left, environment.clipX)
            bottom = Math.max(bottom, environment.clipY)
            right = Math.min(right, environment.clipX + environment.clipWidth)
            top = Math.min(top, environment.clipY + environment.clipHeight)
        }
        environment.setClip(left, bottom, Math.max(0, right - left), Math.max(0, top - bottom))
    }

    /**
     * Clear the target to a color within the clip, and its depth when asked: that is how a zone is erased.
     *
     * @throws {@link Error} When the surface is a recording.
     */
    public clear(color: Color, depth = false): void {
        this.gpu.clearTarget(this.#target("clear"), color, depth, this.#state.environment)
    }


    /**
     * Start noting the zone the vertices drawn next reach, in coordinates of the target, forgetting the one
     * noted so far. For checks in debug: a model and a blit are not noted.
     */
    public startReach(): void {
        this.#reaching = true
        this.#reach.left = Infinity
        this.#reach.top = Infinity
        this.#reach.right = -Infinity
        this.#reach.bottom = -Infinity
    }

    /** Stop noting the zone reached, and get it: none when no vertex was drawn since the start. */
    public endReach(): Readonly<Reach>|null {
        this.#reaching = false
        return this.#reach.left <= this.#reach.right ? this.#reach : null
    }


    //// Drawing ////

    /**
     * Draw vertices given by hand, in local coordinates, tinted and transformed.
     *
     * @param vertices - `RAW_VERTEX_SIZE` numbers per vertex: `x, y, z, u, v, r, g, b, a`, the texture
     * coordinates in texels, the color from 0 to 1, alpha not premultiplied.
     * @param indices - The indices of the vertices, a count the primitive fits. A strip, a fan or a loop is
     * converted to a list first, so it does not join the draw before it.
     * @throws {@link Error} When the primitive does not fit the indices, an index is outside the vertices, or
     * the surface refuses the draw.
     */
    public draw(
        vertices: ArrayLike<number>, indices: ArrayLike<number>, texture: Texture, primitive: Primitive,
    ): void {
        const count = vertices.length / RAW_VERTEX_SIZE
        if(!Number.isInteger(count)) throw new Error(`A vertex takes ${RAW_VERTEX_SIZE} numbers, which the vertices do not divide into.`)
        if(count > MAX_VERTICES) throw new Error(`One draw holds at most ${MAX_VERTICES} vertices, not ${count}.`)
        if(!primitive.fits(indices.length)) throw new Error(`${indices.length} indices leave vertices over for this primitive.`)
        for(let i = 0; i < indices.length; i++){
            if(!(indices[i] >= 0 && indices[i] < count)) throw new Error(`Index ${indices[i]} is outside the ${count} vertices.`)
        }
        if(indices.length === 0) return
        const list = primitive.isIndependent ? indices : listIndices(primitive, indices)
        const state = this.#state
        const geometry = this.#reserve(texture, primitive.list, count, list.length)
        const tint = state.tint
        const isAdditive = state.blend === "additive"
        for(let i = 0; i < count; i++){
            const v = i * RAW_VERTEX_SIZE
            const a = vertices[v + 8] * tint.a
            const r = vertices[v + 5] * tint.r
            const g = vertices[v + 6] * tint.g
            const b = vertices[v + 7] * tint.b
            const color = packColor(r, g, b, a, isAdditive ? 0 : a)
            const x = vertices[v]
            const y = vertices[v + 1]
            const z = vertices[v + 2]
            this.#vertex(geometry, x, y, z, vertices[v + 3], vertices[v + 4], color)
        }
        for(let i = 0; i < list.length; i++) geometry.index(list[i])
    }

    /**
     * Draw a sprite, its origin at a point.
     *
     * @param z - The depth, a greater one nearer.
     */
    public sprite(sprite: Sprite, x: number, y: number, z = 0): void {
        const left = x - sprite.originX
        const top = y - sprite.originY
        const right = left + sprite.width
        const bottom = top + sprite.height
        const u0 = sprite.x
        const v0 = sprite.y
        const u1 = u0 + sprite.width
        const v1 = v0 + sprite.height
        const geometry = this.#reserve(sprite.texture, Primitive.TRIANGLES, 4, 6)
        const color = this.#tintColor()
        this.#vertex(geometry, left, top, z, u0, v0, color)
        this.#vertex(geometry, right, top, z, u1, v0, color)
        this.#vertex(geometry, right, bottom, z, u1, v1, color)
        this.#vertex(geometry, left, bottom, z, u0, v1, color)
        for(const index of QUAD_INDICES) geometry.index(index)
    }

    /**
     * Stretch a sprite over the whole view of the camera of the target, on its focal plane: the upscale of
     * a low resolution texture, or a post-effect with a material. It ignores the transform and the origin of
     * the sprite, and keeps the tint, the material and the environment. The upscale is sharp only when the
     * view is a whole multiple of the sprite.
     *
     * @throws {@link Error} When the surface is a recording, which has no camera.
     */
    public blit(sprite: Sprite): void {
        const camera = this.#target("blit").camera
        const { width, height } = camera.viewSize
        const geometry = this.#reserve(sprite.texture, Primitive.TRIANGLES, 4, 6)
        const color = this.#tintColor()
        const u0 = sprite.x
        const v0 = sprite.y
        const u1 = u0 + sprite.width
        const v1 = v0 + sprite.height
        // Written as they are, since the corners are already in the world.
        const p = this.#point
        const state = this.#state
        camera.focalPointInto(-width / 2, -height / 2, p)
        geometry.vertex(p.x, p.y, p.z, u0, v0, color, state.d0, state.d1, state.d2, state.d3)
        camera.focalPointInto(width / 2, -height / 2, p)
        geometry.vertex(p.x, p.y, p.z, u1, v0, color, state.d0, state.d1, state.d2, state.d3)
        camera.focalPointInto(width / 2, height / 2, p)
        geometry.vertex(p.x, p.y, p.z, u1, v1, color, state.d0, state.d1, state.d2, state.d3)
        camera.focalPointInto(-width / 2, height / 2, p)
        geometry.vertex(p.x, p.y, p.z, u0, v1, color, state.d0, state.d1, state.d2, state.d3)
        for(const index of QUAD_INDICES) geometry.index(index)
    }

    /**
     * Draw a model, with its own key: the current transform and tint apply as uniforms, the environment as it
     * is.
     */
    public model(model: Model): void {
        const state = this.#state
        this.#surface.placeModel(model, state.transform, state.tint, state.environment)
    }

    /**
     * Draw each placement of a multi-model, in order, as `model` does, composed with its own transform and
     * tint.
     */
    public multiModel(multiModel: MultiModel): void {
        const state = this.#state
        this.#surface.placeMultiModel(multiModel, state.transform, state.tint, state.environment)
    }


    //// Shapes ////

    /** Fill a rectangle, from its top left corner. */
    public rect(x: number, y: number, width: number, height: number): void {
        rectShape(this.#shape, x, y, width, height)
        this.#fill()
    }

    /** Fill a triangle, by its three corners. */
    public triangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number): void {
        triangleShape(this.#shape, ax, ay, bx, by, cx, cy)
        this.#fill()
    }

    /** Fill a disk, cut finely enough for its size once drawn. */
    public circle(cx: number, cy: number, radius: number): void {
        this.arc(cx, cy, radius, 0, 2 * Math.PI)
    }

    /**
     * Fill a slice of a disk between two angles.
     *
     * @param start - The angle the slice starts at, in radians, clockwise from the `x` axis since `y` is
     *   down.
     */
    public arc(cx: number, cy: number, radius: number, start: number, end: number): void {
        const segments = curveSegmentsOf(radius * this.#state.transform.planeScale, end - start)
        arcShape(this.#shape, cx, cy, radius, start, end, segments)
        this.#fill()
    }

    /** Fill a thick segment, its ends cut flush. Its thickness follows the transform. */
    public thickLine(a: Point, b: Point, thickness: number): void {
        thickLineShape(this.#shape, a, b, thickness)
        this.#fill()
    }

    /** Fill a polygon of one contour, convex or not, by its corners in order. */
    public polygon(points: readonly Point[]): void {
        polygonShape(this.#shape, points)
        this.#fill()
    }

    /**
     * Fill a thick polyline, its corners mitered, beveled when too sharp, its ends cut flush. Its thickness
     * follows the transform.
     *
     * @param closed - Does the last point join back to the first?
     */
    public multiLine(points: readonly Point[], thickness: number, closed = false): void {
        multiLineShape(this.#shape, points, thickness, closed)
        this.#fill()
    }


    #surface: Surface
    readonly #state: PainterState
    readonly #blends: readonly BlendMode[]|null

    /** Is it noting the zone its vertices reach, and the zone noted so far? */
    #reaching = false
    readonly #reach = { left: 0, top: 0, right: 0, bottom: 0 }

    /** The saved states, kept once allocated, so pushing every frame allocates nothing. */
    readonly #stack: PainterState[] = []
    #depth = 0

    /** The key of the draw being made, rewritten from the state at each draw. */
    readonly #key: DrawKey

    readonly #shape = new Shape()
    readonly #clipMatrix = new Mat4()
    readonly #corners = new Float64Array(8)
    readonly #point = new Vec3()

    /** The target of the painter, for an operation that needs one. */
    #target(operation: string): TargetSurface {
        if(!isTargetSurface(this.#surface)) throw new Error(`A painter cannot ${operation} on a recording, which has no camera.`)
        return this.#surface
    }

    /** Make room for a draw with the current state, after checking its data fits the shader. */
    #reserve(texture: Texture, primitive: Primitive, vertices: number, indices: number): Geometry {
        const state = this.#state
        checkData(state.material.shader.layout, state.d0, state.d1, state.d2, state.d3)
        const key = this.#key
        key.texture = texture
        key.material = state.material
        key.primitive = primitive
        key.blend = blendStateOf(state.blend)
        key.colorMode = state.colorMode
        key.depthTest = state.depthTest
        return this.#surface.reserve(key, state.environment, vertices, indices)
    }

    /** The color of the vertices of a draw without colors of its own: the tint. */
    #tintColor(): number {
        const tint = this.#state.tint
        return packColor(tint.r, tint.g, tint.b, tint.a, this.#state.blend === "additive" ? 0 : tint.a)
    }

    /** Write a vertex given in local coordinates, transformed on the CPU. */
    #vertex(geometry: Geometry, x: number, y: number, z: number, u: number, v: number, color: number): void {
        const m = this.#state.transform.elements
        const state = this.#state
        const wx = m[0] * x + m[4] * y + m[8] * z + m[12]
        const wy = m[1] * x + m[5] * y + m[9] * z + m[13]
        if(this.#reaching){
            const reach = this.#reach
            reach.left = Math.min(reach.left, wx)
            reach.top = Math.min(reach.top, wy)
            reach.right = Math.max(reach.right, wx)
            reach.bottom = Math.max(reach.bottom, wy)
        }
        geometry.vertex(wx, wy, m[2] * x + m[6] * y + m[10] * z + m[14],
            u, v, color, state.d0, state.d1, state.d2, state.d3)
    }

    /** Draw the shape just described, with the white texels and the tint. */
    #fill(): void {
        const shape = this.#shape
        if(shape.indices.length === 0) return
        const white = this.#state.white
        const u = white.x + (white.width >> 1)
        const v = white.y + (white.height >> 1)
        const { pointCount, indices } = shape
        const geometry = this.#reserve(white.texture, Primitive.TRIANGLES, pointCount, indices.length)
        const color = this.#tintColor()
        const positions = shape.positions
        for(let i = 0; i < positions.length; i += 2){
            this.#vertex(geometry, positions[i], positions[i + 1], 0, u, v, color)
        }
        for(const index of indices) geometry.index(index)
    }
}

/** Everything `push` saves and `pop` restores. */
class PainterState {


    public readonly transform = new Mat4()
    public readonly tint = new Color()
    public d0 = 0
    public d1 = 0
    public d2 = 0
    public d3 = 0
    public material: Material
    public blend: BlendMode = "cutout"
    public colorMode: ColorMode = "modulate"
    public depthTest: DepthTest = "nearer-or-equal"
    public white: Sprite
    public readonly environment = new DrawEnvironment()

    constructor(gpu: Gpu){
        this.material = gpu.standardMaterial
        this.white = gpu.white
    }


    public copyFrom(other: PainterState): void {
        this.transform.copyFrom(other.transform)
        this.tint.copyFrom(other.tint)
        this.d0 = other.d0
        this.d1 = other.d1
        this.d2 = other.d2
        this.d3 = other.d3
        this.material = other.material
        this.blend = other.blend
        this.colorMode = other.colorMode
        this.depthTest = other.depthTest
        this.white = other.white
        this.environment.copyFrom(other.environment)
    }
}

/**
 * Write where a local point lands on a target, in pixels from its bottom left corner as `gl.scissor`
 * counts them.
 */
function windowPointOf(
    m: Mat4, x: number, y: number, target: TargetSurface, out: Float64Array, at: number,
): void {
    const e = m.elements
    const w = e[3] * x + e[7] * y + e[15]
    out[at] = ((e[0] * x + e[4] * y + e[12]) / w + 1) / 2 * target.width
    out[at + 1] = ((e[1] * x + e[5] * y + e[13]) / w + 1) / 2 * target.height
}
