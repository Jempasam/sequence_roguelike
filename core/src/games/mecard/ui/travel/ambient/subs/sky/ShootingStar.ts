import { once } from "../../../../../../../engine/animation"
import type { Effect } from "../../../../../../../engine/animation"
import type { Point } from "../../../../../../../engine/math"
import { burst } from "../../../../../../../engine/particles"
import type { AmbientContext } from "../../AmbientContext"
import { AmbientEffect } from "../../AmbientEffect"

/**
 * Throw a streak of light from a point, down and to the right.
 *
 * @param lasting - How many times its usual life it lives.
 */
export function shootStar(context: AmbientContext, from: Point, lasting = 1): void {
    const { additive, random } = context
    for(let spark = 0; spark < 6; spark++){
        burst(additive, random, from.x - spark * 5, from.y - spark * 2, 1, spec => {
            spec.vx = 320
            spec.vy = 130
            spec.life = (0.55 - spark * 0.03) * lasting
            spec.sizeStart = 6 - spark
            spec.sizeEnd = 1
            spec.faceMotion = true
            spec.colorStart.set(1, 1, 1, 1)
            spec.colorEnd.set(0.6, 0.8, 1, 0)
        })
    }
}

/** Makes a streak of light that crosses the top of the map. */
const SHOOTING_STAR_EFFECT: Effect<AmbientContext> = {
    create(context){
        const { random } = context
        const { width, height } = context.size()
        const x = width * (0.1 + random() * 0.5)
        const y = height * (0.05 + random() * 0.2)
        return once(() => shootStar(context, { x, y }))
    },
}

/** A streak of light crosses the top of the map. */
export const SHOOTING_STAR = new AmbientEffect({
    id: "shooting-star",
    category: "surprise",
    spacing: 40,
    stackable: false,
    isPlayable: context => context.outdoors(),
    weight: () => 1,
    effect: SHOOTING_STAR_EFFECT,
})
