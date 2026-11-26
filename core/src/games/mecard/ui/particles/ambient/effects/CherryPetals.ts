import type { AmbientEffect } from "../AmbientEffect"
import { Rate, burst } from "../../../../../../engine/particles"
import { PETAL_FLOORS } from "../themes"
import { timed } from "../plays"

/** Cherry petals fall slowly over the map, swaying as they drift. */
export const CHERRY_PETALS: AmbientEffect = {
    id: "cherry-petals",
    weight: map => PETAL_FLOORS.includes(map.floor()) ? 4 : 0,
    start(map, { alpha, random }){
        const { width } = map.size()
        const rate = new Rate()
        return timed(7, dt => {
            burst(alpha, random, 0, -4, rate.take(9, dt), (spec, rand) => {
                spec.x = rand() * (width + 40) - 20
                spec.vx = 8 + rand() * 14
                spec.vy = 14 + rand() * 10
                spec.ax = (rand() * 2 - 1) * 8
                spec.drag = 0.2
                spec.life = 12
                spec.sizeStart = 2 + rand() * 2
                spec.sizeEnd = spec.sizeStart
                spec.spin = (rand() * 2 - 1) * 3
                const tint = 0.78 + rand() * 0.2
                spec.colorStart.set(1, tint, tint + 0.05, 0.9)
                spec.colorEnd.set(1, tint, tint + 0.05, 0.9)
            })
        })
    },
}
