import type { AmbientEffect } from "../AmbientEffect"
import { Rate, burst } from "../../../../../../engine/particles"
import { timed } from "../plays"

/** A gust of wind: long pale streaks cross the map at a slant, carrying dust and a few leaves. */
export const GUST: AmbientEffect = {
    id: "gust",
    weight: () => 2,
    start(map, { alpha, additive, random }){
        const { width, height } = map.size()
        const leftToRight = random() < 0.5
        const side = leftToRight ? 1 : -1
        const speed = width / 2.5
        const streaks = new Rate()
        const carried = new Rate()
        const startX = (): number => leftToRight ? -20 : width + 20
        return timed(2.4, dt => {
            burst(additive, random, 0, 0, streaks.take(8, dt), (spec, rand) => {
                spec.x = startX()
                spec.y = rand() * height
                spec.vx = speed * side * (0.9 + rand() * 0.4)
                spec.vy = speed * 0.18 * (rand() * 0.6 + 0.4)
                spec.life = 3
                spec.sizeStart = 10 + rand() * 8
                spec.sizeEnd = 4
                spec.faceMotion = true
                spec.colorStart.set(0.9, 0.95, 1, 0.22)
                spec.colorEnd.set(0.9, 0.95, 1, 0)
            })
            burst(alpha, random, 0, 0, carried.take(7, dt), (spec, rand) => {
                const leaf = rand() < 0.3
                spec.x = startX()
                spec.y = rand() * height
                spec.vx = speed * side * (0.6 + rand() * 0.4)
                spec.vy = speed * 0.12
                spec.ay = (rand() * 2 - 1) * 40
                spec.life = 3.5
                spec.sizeStart = leaf ? 3 : 2
                spec.sizeEnd = spec.sizeStart
                spec.spin = (rand() * 2 - 1) * 8
                if(leaf) spec.colorStart.set(0.55, 0.7, 0.25, 0.9)
                else spec.colorStart.set(0.72, 0.66, 0.54, 0.7)
                spec.colorEnd.set(spec.colorStart.r, spec.colorStart.g, spec.colorStart.b, 0)
            })
        })
    },
}
