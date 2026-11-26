import type { AmbientEffect } from "../AmbientEffect"
import { Rate } from "../../../../../../engine/particles"
import { radial } from "../../recipes"
import { MINE_FLOORS } from "../themes"
import type { Part } from "../plays"
import { rigid, timed, together } from "../plays"

const DURATION = 6

/** A mine cart rattles across the bottom of the map, sparks flying from its wheels. */
export const MINE_CART: AmbientEffect = {
    id: "mine-cart",

    weight: map => MINE_FLOORS.includes(map.floor()) ? 4 : 0,

    start(map, { alpha, additive, random }){
        const { width, height } = map.size()
        const y = height * (0.78 + random() * 0.12)
        const rightward = random() < 0.5
        const side = rightward ? 1 : -1
        const parts: Part[] = [
            { size: 9, color: 0x5a5560, offset: age => ({ x: 0, y: Math.sin(age * 30) * 0.7 }) },
            { size: 7, color: 0x8a7a6a, offset: age => ({ x: 0, y: -4 + Math.sin(age * 30) * 0.7 }) },
            { size: 3, color: 0x1a1a1e, offset: () => ({ x: -3, y: 5 }) },
            { size: 3, color: 0x1a1a1e, offset: () => ({ x: 3, y: 5 }) },
        ]
        const path = (progress: number): { x: number, y: number } => {
            const share = rightward ? progress : 1 - progress
            return { x: -20 + (width + 40) * share, y }
        }
        const sparks = new Rate()
        return together([
            rigid(alpha, parts, DURATION, path),
            timed(DURATION, (dt, age) => {
                const count = sparks.take(10, dt)
                if(count === 0) return
                const at = path(Math.min(1, age / DURATION))
                radial(additive, random, { x: at.x - 4 * side, y: at.y + 7 }, count, {
                    from: 0xffe08a, to: 0xff7a2a, size: 2, life: 0.3,
                }, { speed: 30, angle: [-2.6, -0.5], gravity: 200 })
            }),
        ])
    },
}
