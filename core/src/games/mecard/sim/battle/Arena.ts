import { Vector2 } from "../base/Vector2"

/** A round pillar of stone: where one stands and how wide it is, to be set up in a battle. */
export interface Pillar {
    readonly center: Vector2

    /** Its radius, in meters. */
    readonly radius: number
}

/**
 * The room a battle is fought in: its size in meters. Positions are free: the grid drawn on the floor is a
 * ruler for the eye, not a constraint. What stands in it, pillars included, is made of units.
 */
export class Arena {


    constructor(
        /** Its width, in meters. */
        public readonly width: number,

        /** Its height, in meters. */
        public readonly height: number,
    ){}


    /** Does a disc of a radius around a point lie within the walls? */
    public inside(point: Vector2, radius = 0): boolean {
        return point.x - radius >= 0 && point.y - radius >= 0
            && point.x + radius <= this.width && point.y + radius <= this.height
    }

    /** The closest point to another where a disc of a radius lies within the walls. */
    public clamped(point: Vector2, radius: number): Vector2 {
        const x = Math.min(this.width - radius, Math.max(radius, point.x))
        const y = Math.min(this.height - radius, Math.max(radius, point.y))
        return new Vector2(x, y)
    }

    /** Does a disc of a radius around a point cross a wall? */
    public solid(point: Vector2, radius: number): boolean {
        return !this.inside(point, radius)
    }
}
