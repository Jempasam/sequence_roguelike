import type { Vector2 } from "../../sim/base/Vector2"
import type { Pose } from "../../sim/battle/Action"
import type { Hitbox } from "../../sim/battle/hitbox/Hitbox"

/** What a picture is drawn from, of the hitbox of its unit where it stands: all in meters, in the arena. */
export interface HitboxMetrics {
    /** The middle of the hitbox, where the unit stands. */
    readonly center: Vector2

    /** Where it faces, a meter long: the length of its bounding box lies along it. */
    readonly direction: Vector2

    /** How long its bounding box is, turned with it, along where it faces. */
    readonly length: number

    /** How wide its bounding box is, across where it faces. */
    readonly width: number

    /** The diameter of the smallest disc around its middle that holds it whole. */
    readonly outer: number

    /** The diameter of the largest disc around its middle that lies whole inside it. */
    readonly inner: number
}

/** The measures a picture is drawn from, of a hitbox standing at a pose. */
export function hitboxMetrics(hitbox: Hitbox, pose: Pose): HitboxMetrics {
    const [length, width] = hitbox.extent
    return {
        center: pose.position,
        direction: pose.direction,
        length,
        width,
        outer: hitbox.reach * 2,
        inner: hitbox.inner * 2,
    }
}
