import { Mat4, Quat, Vec3 } from "../math"

import type { Texture } from "./Texture"

/**
 * How far a camera sees in front of and behind its focal plane by default, in world units. The depth
 * buffer has 16 bits, so a game narrows it to the range of `z` it actually produces.
 */
const DEFAULT_DEPTH = 1000

/** The number of values a camera is computed from: position, rotation, fov, view size and depth range. */
const INPUT_COUNT = 12

/** The size of the focal plane, in world units. */
export interface ViewSize {
    width: number
    height: number
}

/**
 * Where a target is seen from: the projection of the world onto the pixels of a surface.
 *
 * @remarks
 * The world has `x` to the right and `y` down, as on the screen and in Canvas 2D, and `z` towards the eye:
 * a greater `z` is nearer, as a height above the floor, and wins the depth test. Seen from above, the game
 * makes `z` grow with `y`, so whatever is lower on the screen is drawn in front.
 *
 * Every texture has its row 0 at `y = 0`, whether it comes from an image or was drawn into: a
 * `TextureSurface` flips its projection to cancel the bottom-up rows of a framebuffer. So the same camera
 * shows a sprite the same way up on the screen and in a texture.
 *
 * A camera is a piece of data, read when a draw is made. Changing a field between two draws of the same
 * pass is allowed: it only splits them into two calls.
 */
export class Camera {


    /** The center of the focal plane. */
    public readonly position = new Vec3()

    /** How the camera is turned. None, it looks down the `z` axis, with `y` down on the screen. */
    public readonly rotation = new Quat()

    /**
     * The vertical field of view, in radians. 0 is an orthographic projection, built as such, not as a
     * limit. Changing it keeps the size of what lies on the focal plane, so a game can blend from one to
     * the other.
     */
    public fov = 0

    /** The width and height of the focal plane, in world units. */
    public readonly viewSize: ViewSize

    /**
     * How far in front of the focal plane the camera sees, in world units. In perspective, it stays below
     * {@link Camera.eyeDistance}, or the near plane would pass behind the eye.
     */
    public depthNear = DEFAULT_DEPTH

    /** How far behind the focal plane the camera sees, in world units. */
    public depthFar = DEFAULT_DEPTH

    /**
     * An orthographic camera centered on the origin.
     *
     * @param width - The width of the focal plane, in world units.
     * @param height - The height of the focal plane, in world units.
     */
    constructor(width: number, height: number){
        this.viewSize = { width, height }
    }

    /**
     * The camera showing one world unit per pixel of a target of this size, the point `(0, 0)` on the
     * top left corner of its pixel `(0, 0)`.
     */
    public static pixelSpace(width: number, height: number): Camera {
        const camera = new Camera(width, height)
        // Integer, so an odd size is aligned by the camera's own half-pixel shift.
        camera.position.set(Math.floor(width / 2), Math.floor(height / 2), 0)
        return camera
    }

    /**
     * The camera mapping one world unit to one texel of a texture: the point `(x, y)` lies on the texel
     * `(x, y)`. It draws into a texture at the coordinates its sprites use, such as a slot of an atlas.
     */
    public static texelSpace(texture: Texture): Camera {
        return Camera.pixelSpace(texture.width, texture.height)
    }


    //// Projection ////

    /** How far the eye stands behind the focal plane, in world units: infinite in orthographic. */
    public get eyeDistance(): number {
        if(this.fov === 0) return Infinity
        return this.viewSize.height / 2 / Math.tan(this.fov / 2)
    }

    /**
     * A number that changes whenever the projection does, so a batch can tell in one comparison that the
     * camera moved since its first draw.
     */
    public get version(): number {
        this.#refresh()
        return this.#version
    }

    /** Write the projection of the world into clip space, `y` up as WebGL has it. */
    public viewProjectionInto(out: Mat4): Mat4 {
        this.#refresh()
        return out.copyFrom(this.#viewProjection)
    }

    /**
     * Write where a point of the visible focal plane lies in the world.
     *
     * @param x - The point, from the center of the view, `y` down, in world units.
     */
    public focalPointInto(x: number, y: number, out: Vec3): Vec3 {
        this.#refresh()
        const rotation = this.#rotation.elements
        const localX = x + this.#shiftX
        const localY = y + this.#shiftY
        return out.set(
            this.position.x + rotation[0] * localX + rotation[4] * localY,
            this.position.y + rotation[1] * localX + rotation[5] * localY,
            this.position.z + rotation[2] * localX + rotation[6] * localY,
        )
    }


    //// Cache ////

    /** The values the projection was last computed from. */
    readonly #inputs = new Float64Array(INPUT_COUNT).fill(NaN)

    #version = 0
    readonly #viewProjection = new Mat4()
    readonly #rotation = new Mat4()
    readonly #view = new Mat4()
    readonly #projection = new Mat4()

    /** How far the center of the view is moved to put the edges of an odd view on whole pixels. */
    #shiftX = 0
    #shiftY = 0

    /** Compute the projection again, when a value it depends on has changed since. */
    #refresh(): void {
        const { position: p, rotation: q, viewSize: size } = this
        // Each value is taken even after a change is found, so the next comparison starts from all of them.
        let changed = this.#take(0, p.x)
        changed = this.#take(1, p.y) || changed
        changed = this.#take(2, p.z) || changed
        changed = this.#take(3, q.x) || changed
        changed = this.#take(4, q.y) || changed
        changed = this.#take(5, q.z) || changed
        changed = this.#take(6, q.w) || changed
        changed = this.#take(7, this.fov) || changed
        changed = this.#take(8, size.width) || changed
        changed = this.#take(9, size.height) || changed
        changed = this.#take(10, this.depthNear) || changed
        changed = this.#take(11, this.depthFar) || changed
        if(!changed) return
        try {
            this.#check()
        } catch(error){
            // Forgotten, so the next draw fails the same way instead of using the last valid projection.
            this.#inputs.fill(NaN)
            throw error
        }
        this.#computeView()
        this.#computeProjection()
        this.#viewProjection.setProduct(this.#projection, this.#view)
        this.#version++
    }

    /** Keep one input value. Was it different from the last one? */
    #take(index: number, value: number): boolean {
        if(this.#inputs[index] === value) return false
        this.#inputs[index] = value
        return true
    }

    #check(): void {
        const { width, height } = this.viewSize
        if(!(width > 0 && height > 0)) throw new Error(`A camera needs a positive view size, not ${width}×${height}.`)
        if(!(this.fov >= 0 && this.fov < Math.PI)) throw new Error(`A camera fov lies in [0, π), not ${this.fov}.`)
        if(!(this.depthNear + this.depthFar > 0)) throw new Error("A camera needs a depth range that is not empty.")
        if(this.fov > 0 && this.depthNear >= this.eyeDistance){
            throw new Error(`The near plane of the camera, ${this.depthNear} in front of the focal plane, is behind`
                + ` its eye, ${this.eyeDistance} away. Lower depthNear or the fov.`)
        }
    }

    /** The view: the world seen from the camera, `local = rotationᵀ × (world - position) - shift`. */
    #computeView(): void {
        const isOrthographic = this.fov === 0
        this.#shiftX = isOrthographic && this.viewSize.width % 2 === 1 ? 0.5 : 0
        this.#shiftY = isOrthographic && this.viewSize.height % 2 === 1 ? 0.5 : 0
        const r = this.#rotation.setRotation(this.rotation).elements
        const v = this.#view.identity().elements
        for(let row = 0; row < 3; row++){
            for(let column = 0; column < 3; column++) v[column * 4 + row] = r[row * 4 + column]
        }
        const { x, y, z } = this.position
        v[12] = -(v[0] * x + v[4] * y + v[8] * z) - this.#shiftX
        v[13] = -(v[1] * x + v[5] * y + v[9] * z) - this.#shiftY
        v[14] = -(v[2] * x + v[6] * y + v[10] * z)
    }

    /**
     * The projection of the view into clip space. `y` is negated, from down in the world to up in clip
     * space, and a greater `z` gets a smaller depth, so the standard `LEQUAL` keeps the nearest.
     */
    #computeProjection(): void {
        const { width, height } = this.viewSize
        const near = this.depthNear
        const far = this.depthFar
        const e = this.#projection.identity().elements
        if(this.fov === 0){
            e[0] = 2 / width
            e[5] = -2 / height
            e[10] = -2 / (near + far)
            e[14] = (near - far) / (near + far)
            return
        }
        const d = this.eyeDistance
        const n = d - near
        const f = d + far
        e[0] = 2 * d / width
        e[5] = -2 * d / height
        e[10] = -(f + n) / (f - n)
        e[11] = -1
        e[14] = ((f + n) * d - 2 * f * n) / (f - n)
        e[15] = d
    }
}
