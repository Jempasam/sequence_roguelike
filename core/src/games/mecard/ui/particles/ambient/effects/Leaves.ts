import type { AmbientEffect } from "../AmbientEffect"
import { Rate, burst } from "../../../../../../engine/particles"
import { LEAF_FLOORS } from "../themes"
import { timed } from "../plays"

/** Leaves drift across the map in the wind. */
export const LEAVES: AmbientEffect = {
    id: "leaves",
    weight: map => LEAF_FLOORS.includes(map.floor()) ? 4 : 0,
    start(map, { alpha, random }){
        const { width, height } = map.size()
        const rate = new Rate()
        return timed(5, dt => {
            burst(alpha, random, -4, random() * height * 0.5, rate.take(4, dt), (spec, rand) => {
                const warm = rand() < 0.4
                spec.vx = width / 9 * (0.8 + rand() * 0.5)
                spec.vy = 14 + rand() * 12
                spec.ay = Math.sin(rand() * 6) * 6
                spec.life = 11
                spec.sizeStart = 3
                spec.sizeEnd = 3
                spec.spin = (rand() * 2 - 1) * 4
                spec.colorStart.set(warm ? 0.8 : 0.45, warm ? 0.55 : 0.75, 0.2, 0.9)
                spec.colorEnd.set(warm ? 0.8 : 0.45, warm ? 0.55 : 0.75, 0.2, 0.9)
            })
        })
    },
}
