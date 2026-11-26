import type { AmbientEffect } from "../AmbientEffect"
import { burst } from "../../../../../../engine/particles"
import { once } from "../plays"

/** How long the flock takes to cross the map, in seconds. */
const CROSSING = 9

/** A flock of birds crosses the map from left to right, in a V. */
export const BIRD_FLOCK: AmbientEffect = {
    id: "bird-flock",
    weight: () => 2,
    start(map, { alpha, random }){
        const { width, height } = map.size()
        const y = height * (0.1 + random() * 0.3)
        const birds = 5 + Math.floor(random() * 3)
        return once(() => {
            for(let bird = 0; bird < birds; bird++){
                const rank = Math.ceil(bird / 2)
                const side = bird % 2 === 0 ? 1 : -1
                burst(alpha, random, -12 - rank * 9, y + rank * 5 * side, 1, spec => {
                    spec.vx = (width + 60) / CROSSING
                    spec.vy = Math.sin(bird) * 2
                    spec.life = CROSSING + rank * 0.1
                    spec.sizeStart = 4
                    spec.sizeEnd = 4
                    spec.faceMotion = true
                    spec.colorStart.set(0.15, 0.15, 0.2, 0.8)
                    spec.colorEnd.set(0.15, 0.15, 0.2, 0.8)
                })
            }
        })
    },
}
