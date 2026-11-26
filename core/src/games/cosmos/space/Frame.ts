import { Quat, Vec3 } from "../../../engine/math"

/**
 * How the local space of a body lies in the space of its parent: a point of the body goes to the parent
 * by a turn, a scaling, then a move. It is the transformation the engine gives to each level, and the
 * links of the chain that carries a point from one scale to another. Frames never change once built.
 */
export class Frame {


    constructor(
        public readonly origin: Vec3 = new Vec3(),
        public readonly rotation: Quat = new Quat(),
        public readonly scale = 1,
    ){}


    /** The frame that changes nothing. */
    public static identity(): Frame {
        return new Frame()
    }

    /** Take a point of the body to the space of its parent. */
    public apply(point: Vec3, out = new Vec3()): Vec3 {
        const turned = rotate(this.rotation, point.x, point.y, point.z)
        return out.set(
            turned[0] * this.scale + this.origin.x,
            turned[1] * this.scale + this.origin.y,
            turned[2] * this.scale + this.origin.z,
        )
    }

    /** Take a point of the parent back to the space of the body. */
    public unapply(point: Vec3, out = new Vec3()): Vec3 {
        const { x, y, z } = this.origin
        const back = rotate(conjugate(this.rotation), point.x - x, point.y - y, point.z - z)
        return out.set(back[0] / this.scale, back[1] / this.scale, back[2] / this.scale)
    }

    /** The frame that does what this one undoes. */
    public inverse(): Frame {
        const rotation = conjugate(this.rotation)
        const moved = rotate(rotation, -this.origin.x, -this.origin.y, -this.origin.z)
        const origin = new Vec3(moved[0] / this.scale, moved[1] / this.scale, moved[2] / this.scale)
        return new Frame(origin, rotation, 1 / this.scale)
    }

    /** The frame that does what `inner` does first, then what this one does. */
    public after(inner: Frame): Frame {
        const rotation = this.rotation.clone().multiply(inner.rotation)
        return new Frame(this.apply(inner.origin), rotation, this.scale * inner.scale)
    }
}

/** Turn a vector by a unit quaternion. */
export function rotate(q: Quat, x: number, y: number, z: number): [number, number, number] {
    const tx = 2 * (q.y * z - q.z * y)
    const ty = 2 * (q.z * x - q.x * z)
    const tz = 2 * (q.x * y - q.y * x)
    return [
        x + q.w * tx + (q.y * tz - q.z * ty),
        y + q.w * ty + (q.z * tx - q.x * tz),
        z + q.w * tz + (q.x * ty - q.y * tx),
    ]
}

/** The turn that undoes a turn. */
export function conjugate(q: Quat): Quat {
    return new Quat(-q.x, -q.y, -q.z, q.w)
}
