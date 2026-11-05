/**
 * A point or a direction in three dimensions. Its operations work in place, so a vector kept in a field
 * and reused every frame allocates nothing.
 */
export class Vec3 {


    constructor(
        public x = 0,
        public y = 0,
        public z = 0,
    ){}


    /** Give the vector new coordinates. */
    public set(x: number, y: number, z: number): this {
        this.x = x
        this.y = y
        this.z = z
        return this
    }

    /** Take the coordinates of another vector. */
    public copyFrom(other: Vec3): this {
        return this.set(other.x, other.y, other.z)
    }

    /** A new vector with the same coordinates. */
    public clone(): Vec3 {
        return new Vec3(this.x, this.y, this.z)
    }

    /** Does the other vector have exactly the same coordinates? */
    public equals(other: Vec3): boolean {
        return this.x === other.x && this.y === other.y && this.z === other.z
    }
}
