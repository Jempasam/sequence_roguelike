import type { Quat } from "./Quat"
import type { Vec3 } from "./Vec3"

/** The product being computed, so `setProduct` can take the matrix it writes as one of its factors. */
const PRODUCT = new Float32Array(16)

/**
 * A 4×4 matrix, column-major as WebGL reads it. Its operations work in place, so a matrix kept in a field
 * and reused every frame allocates nothing.
 *
 * @remarks
 * Composition follows the order of Canvas 2D: `m.translate(...).rotateZ(...)` moves first, then rotates
 * around the moved origin. Each operation multiplies on the right, `this = this × operation`.
 */
export class Mat4 {


    /** The sixteen values, column by column. */
    public readonly elements = new Float32Array(16)

    /** The identity, by default. */
    constructor(){
        this.identity()
    }


    //// Values ////

    /** Become the identity. */
    public identity(): this {
        this.elements.fill(0)
        this.elements[0] = 1
        this.elements[5] = 1
        this.elements[10] = 1
        this.elements[15] = 1
        return this
    }

    /** Take the values of another matrix. */
    public copyFrom(other: Mat4): this {
        this.elements.set(other.elements)
        return this
    }

    /** A new matrix with the same values. */
    public clone(): Mat4 {
        return new Mat4().copyFrom(this)
    }

    /** Does the other matrix have exactly the same values? */
    public equals(other: Mat4): boolean {
        for(let i = 0; i < 16; i++) if(this.elements[i] !== other.elements[i]) return false
        return true
    }

    /** Is it the identity? */
    public get isIdentity(): boolean {
        const e = this.elements
        for(let i = 0; i < 16; i++) if(e[i] !== (i % 5 === 0 ? 1 : 0)) return false
        return true
    }


    //// Composition ////

    /** Become the product of two matrices, `a × b`. Either may be this matrix. */
    public setProduct(a: Mat4, b: Mat4): this {
        const x = a.elements
        const y = b.elements
        for(let column = 0; column < 4; column++){
            for(let row = 0; row < 4; row++){
                PRODUCT[column * 4 + row] = x[row] * y[column * 4] + x[4 + row] * y[column * 4 + 1]
                    + x[8 + row] * y[column * 4 + 2] + x[12 + row] * y[column * 4 + 3]
            }
        }
        this.elements.set(PRODUCT)
        return this
    }

    /** Apply another matrix before this one: `this = this × other`. */
    public multiply(other: Mat4): this {
        return this.setProduct(this, other)
    }

    /** Move the origin. */
    public translate(x: number, y: number, z = 0): this {
        const e = this.elements
        for(let row = 0; row < 4; row++) e[12 + row] += e[row] * x + e[4 + row] * y + e[8 + row] * z
        return this
    }

    /**
     * Rotate around the z axis. With y pointing down, as on the screen, a positive angle turns clockwise,
     * as in Canvas 2D.
     *
     * @param angle - The angle, in radians.
     */
    public rotateZ(angle: number): this {
        const e = this.elements
        const c = Math.cos(angle)
        const s = Math.sin(angle)
        for(let row = 0; row < 4; row++){
            const x = e[row]
            const y = e[4 + row]
            e[row] = c * x + s * y
            e[4 + row] = c * y - s * x
        }
        return this
    }

    /** Scale each axis. */
    public scale(x: number, y = x, z = 1): this {
        const e = this.elements
        for(let row = 0; row < 4; row++){
            e[row] *= x
            e[4 + row] *= y
            e[8 + row] *= z
        }
        return this
    }

    /** Become the rotation of a quaternion. */
    public setRotation(q: Quat): this {
        const { x, y, z, w } = q
        const e = this.elements
        e[0] = 1 - 2 * (y * y + z * z)
        e[1] = 2 * (x * y + z * w)
        e[2] = 2 * (x * z - y * w)
        e[3] = 0
        e[4] = 2 * (x * y - z * w)
        e[5] = 1 - 2 * (x * x + z * z)
        e[6] = 2 * (y * z + x * w)
        e[7] = 0
        e[8] = 2 * (x * z + y * w)
        e[9] = 2 * (y * z - x * w)
        e[10] = 1 - 2 * (x * x + y * y)
        e[11] = 0
        e[12] = 0
        e[13] = 0
        e[14] = 0
        e[15] = 1
        return this
    }


    //// Points ////

    /**
     * Transform a point, without the perspective divide: the matrix is taken as affine.
     *
     * @param out - Where the result goes. It may be the point itself.
     */
    public transformPoint(point: Vec3, out: Vec3): Vec3 {
        const e = this.elements
        const { x, y, z } = point
        return out.set(
            e[0] * x + e[4] * y + e[8] * z + e[12],
            e[1] * x + e[5] * y + e[9] * z + e[13],
            e[2] * x + e[6] * y + e[10] * z + e[14],
        )
    }

    /**
     * How much the matrix stretches lengths of the xy plane at most, so a shape can pick how finely to cut
     * itself once drawn.
     */
    public get planeScale(): number {
        const e = this.elements
        return Math.max(Math.hypot(e[0], e[1]), Math.hypot(e[4], e[5]))
    }
}
