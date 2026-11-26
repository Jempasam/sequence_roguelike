import type { AmbientEffect } from "../AmbientEffect"
import { radial } from "../../recipes"
import { STORM_FLOORS } from "../themes"
import { jagged, once, queue } from "../plays"

/** The time between two strikes, in seconds. */
const GAP = 0.3

/** Lightning strikes the map from the top of the screen, with a flash, sometimes twice. */
export const LIGHTNING: AmbientEffect = {
    id: "lightning",

    weight: map => STORM_FLOORS.includes(map.floor()) ? 4 : 0,

    start(map, { additive, random }){
        const { width, height } = map.size()
        const spot = (): { x: number, y: number } => ({
            x: width * (0.1 + random() * 0.8), y: height * (0.4 + random() * 0.5),
        })
        const strikes = random() < 0.3 ? [spot(), spot()] : [spot()]
        return queue(strikes.length, GAP, index => once(() => {
            const target = strikes[index]
            const line = jagged(random, { x: target.x + (random() * 2 - 1) * 30, y: -4 }, target, 9, 12)
            const bolt = { from: 0xffffff, to: 0x9ac8ff, size: 3, end: 1, life: 0.18 }
            for(const point of line) radial(additive, random, point, 2, bolt, { speed: 0 })
            radial(additive, random, target, 6, { from: 0xdff4ff, size: 2, life: 0.3 }, { speed: 70 })
            radial(additive, random, { x: width / 2, y: height / 2 }, 1, {
                from: 0x8aa8ff, size: Math.max(width, height) * 1.5, life: 0.14,
            }, { speed: 0 })
        }))
    },
}
