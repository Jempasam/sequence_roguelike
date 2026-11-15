import type { Vector2 } from "./Vector2"

/**
 * A way to face, as a text a card tells: what a card choosing among directions names its choices by, so a
 * reader draws them as a dial rather than reading them.
 *
 * @remarks
 * It holds the unit vector, and computes no angle: the simulation must not use trigonometry, and a reader
 * that wants degrees works them out for itself.
 */
export class Direction {


    constructor(
        /** The unit vector it points along. */
        public readonly vector: Vector2,
    ){}


    public toString(): string {
        return `${Math.round(this.vector.x * 100) / 100}, ${Math.round(this.vector.y * 100) / 100}`
    }
}
