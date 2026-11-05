/**
 * A rotation, as a unit quaternion. Its operations work in place, so a rotation kept in a field and
 * reused every frame allocates nothing.
 */
export class Quat {


    /** The rotation that does nothing. */
    constructor(
        public x = 0,
        public y = 0,
        public z = 0,
        public w = 1,
    ){}


    /** Give the quaternion new components. */
    public set(x: number, y: number, z: number, w: number): this {
        this.x = x
        this.y = y
        this.z = z
        this.w = w
        return this
    }

    /** Become the rotation that does nothing. */
    public identity(): this {
        return this.set(0, 0, 0, 1)
    }

    /**
     * Become the rotation of an angle around an axis.
     *
     * @param x - The axis, not necessarily of unit length.
     * @param angle - The angle, in radians.
     */
    public setAxisAngle(x: number, y: number, z: number, angle: number): this {
        const length = Math.hypot(x, y, z)
        if(length === 0) throw new Error("A rotation axis cannot be the zero vector.")
        const s = Math.sin(angle / 2) / length
        return this.set(x * s, y * s, z * s, Math.cos(angle / 2))
    }

    /** Take the components of another quaternion. */
    public copyFrom(other: Quat): this {
        return this.set(other.x, other.y, other.z, other.w)
    }

    /** Become the rotation applying another one first, then this one: `this = this × other`. */
    public multiply(other: Quat): this {
        const { x, y, z, w } = this
        return this.set(
            w * other.x + x * other.w + y * other.z - z * other.y,
            w * other.y - x * other.z + y * other.w + z * other.x,
            w * other.z + x * other.y - y * other.x + z * other.w,
            w * other.w - x * other.x - y * other.y - z * other.z,
        )
    }

    /** Bring the quaternion back to unit length, after many multiplications drifted it. */
    public normalize(): this {
        const length = Math.hypot(this.x, this.y, this.z, this.w)
        if(length === 0) throw new Error("The zero quaternion is not a rotation.")
        return this.set(this.x / length, this.y / length, this.z / length, this.w / length)
    }

    /** A new quaternion with the same components. */
    public clone(): Quat {
        return new Quat(this.x, this.y, this.z, this.w)
    }

    /** Does the other quaternion have exactly the same components? */
    public equals(other: Quat): boolean {
        return this.x === other.x && this.y === other.y && this.z === other.z && this.w === other.w
    }
}
