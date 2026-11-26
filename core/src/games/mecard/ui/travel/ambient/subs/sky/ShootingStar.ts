import { once } from "../../../../../../../engine/animation"
import type { Effect } from "../../../../../../../engine/animation"
import { burst } from "../../../../../../../engine/particles"
import type { AmbientContext } from "../../AmbientContext"
import { AmbientEffect } from "../../AmbientEffect"

/** Makes a streak of light that crosses the top of the map. */
const SHOOTING_STAR_EFFECT: Effect<AmbientContext> = {
    create(context){
        const { additive, random } = context
        const { width, height } = context.size()
        const x = width * (0.1 + random() * 0.5)
        const y = height * (0.05 + random() * 0.2)
        return once(() => {
            for(let spark = 0; spark < 6; spark++){
                burst(additive, random, x - spark * 5, y - spark * 2, 1, spec => {
                    spec.vx = 320
                    spec.vy = 130
                    spec.life = 0.55 - spark * 0.03
                    spec.sizeStart = 6 - spark
                    spec.sizeEnd = 1
                    spec.faceMotion = true
                    spec.colorStart.set(1, 1, 1, 1)
                    spec.colorEnd.set(0.6, 0.8, 1, 0)
                })
            }
        })
    },
}

/** A streak of light crosses the top of the map. */
export const SHOOTING_STAR = new AmbientEffect({
    id: "shooting-star",
    spacing: 40,
    stackable: false,
    isPlayable: () => true,
    weight: () => 1,
    effect: SHOOTING_STAR_EFFECT,
})
