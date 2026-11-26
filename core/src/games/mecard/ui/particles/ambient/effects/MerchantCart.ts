import type { AmbientEffect } from "../AmbientEffect"
import { Rate } from "../../../../../../engine/particles"
import { DUST, radial } from "../../recipes"
import { SHOP_HALTS } from "../themes"
import type { Part } from "../plays"
import { lerp, outsidePoint, pick, rigid, together, timed } from "../plays"

/** How long the cart takes, in seconds. */
const DURATION = 9

const WAGON = 0x8a5a2e
const WHEEL = 0x2a2420
const HORSE = 0x3a2e2a

/** A cart with its horse goes between the edge of the screen and a place that sells, one way or the other. */
export const MERCHANT_CART: AmbientEffect = {
    id: "merchant-cart",

    weight: map => map.halts().some(halt => SHOP_HALTS.includes(halt.type)) ? 3 : 0,

    start(map, { alpha, random }){
        const halt = pick(random, map.halts().filter(each => SHOP_HALTS.includes(each.type)))
        const away = outsidePoint(random, map.size(), halt.position)
        const arriving = random() < 0.5
        const from = arriving ? away : halt.position
        const to = arriving ? halt.position : away
        const side = to.x >= from.x ? 1 : -1
        const parts: Part[] = [
            { size: 9, color: WAGON, offset: () => ({ x: 0, y: 0 }) },
            { size: 4, color: WHEEL, offset: age => ({ x: -3, y: 5 + Math.sin(age * 9) * 0.5 }) },
            { size: 4, color: WHEEL, offset: age => ({ x: 3, y: 5 + Math.sin(age * 9 + 1) * 0.5 }) },
            { size: 6, color: HORSE, offset: () => ({ x: 10 * side, y: 1 }) },
        ]
        const path = (progress: number, age: number): { x: number, y: number } => {
            const at = lerp(from, to, progress)
            return { x: at.x, y: at.y - Math.abs(Math.sin(age * 5)) * 1.2 }
        }
        const dust = new Rate()
        return together([
            rigid(alpha, parts, DURATION, path),
            timed(DURATION, (dt, age) => {
                const count = dust.take(6, dt)
                if(count === 0) return
                const at = path(Math.min(1, age / DURATION), age)
                const grain = { ...DUST, size: 2, end: 5, life: 0.7 }
                radial(alpha, random, { x: at.x - 4 * side, y: at.y + 8 }, count, grain, { speed: 8 })
            }),
        ])
    },
}
