import { Quat, Vec3 } from "../../../engine/math"

/** The address of an element inside a level: only that level reads it, the engine only carries it. */
export type Address = readonly number[]

/**
 * Where something is in a level: a position in the units of that level, the turn of the camera there, and
 * what the level needs to find its element again. It is what the levels convert between each other.
 */
export class Pose {


    constructor(
        /** The position, in the units of the level. */
        public position: Vec3 = new Vec3(),

        /** The turn of the camera, in the space of the level. */
        public orientation: Quat = new Quat(),

        /** The size of one unit of the level, in the units of the level above. 1 for the whole. */
        public scale = 1,

        /** The element of the level this pose is in. */
        public at: Address = [],
    ){}


    /** A copy that shares nothing with this pose. */
    public clone(): Pose {
        return new Pose(this.position.clone(), this.orientation.clone(), this.scale, this.at)
    }
}
