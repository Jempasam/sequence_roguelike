import type { Animation } from "../../../../../../engine/animation"
import { follow } from "../../../../../../engine/particles"
import type { Follower } from "../../../../../../engine/particles"
import type { AmbientContext } from "../AmbientContext"
import { between } from "./Grain"
import type { Range } from "./Grain"

/** How far below a flier its shadow may lie, as shares of the height of the space. */
const GAP: Range = [0.3, 0.45]

/** How wide a shadow is, as a share of the width of its flier: it lies far away. */
const SHRINK = 0.8

const OPACITY = 0.25

/**
 * The shadow a flier casts far below it: its picture in black, which follows it from side to side, flat, at a
 * distance drawn once, never under the bottom of the area. Start it before the flier, to be drawn under it.
 *
 * @param flier - How the flier is led.
 * @param altitude - The height the flier flies at, its waves left out.
 */
export function castShadow(context: AmbientContext, flier: Follower, altitude: number): Animation {
    const { random } = context
    const area = context.area()
    const size = flier.size * SHRINK
    const tall = flier.sprite ? size * flier.sprite.height / flier.sprite.width : size
    const gap = context.size().height * between(random, GAP)
    const ground = Math.min(altitude + gap, area.y + area.height - tall / 2)
    return follow({
        system: flier.system, sprite: flier.sprite, mirrored: flier.mirrored, size, color: 0x000000,
        opacity: OPACITY, duration: flier.duration,
        path: (progress, age) => ({ x: flier.path(progress, age).x, y: ground }),
    })
}
