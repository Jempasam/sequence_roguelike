import type { AmbientEffect } from "../AmbientEffect"
import { Rate } from "../../../../../../engine/particles"
import { glint, sparkAt } from "../../recipes"
import { follow, lerp, pickTwo } from "../plays"

/** A coin rolls from a fight to another and glints. */
export const LOST_COIN: AmbientEffect = {
    id: "lost-coin",
    weight: map => map.fights().length >= 2 && map.coin() ? 2 : 0,
    start(map, { alpha, additive, random }){
        const [from, to] = pickTwo(random, map.fights())
        const coin = map.coin()
        if(!coin) return null
        const glints = new Rate()
        return follow({
            system: alpha, sprite: coin, size: 7, color: 0xffd34d, duration: 5, spin: 8,
            path: (progress, age) => {
                const at = lerp(from.position, to.position, progress)
                return { x: at.x, y: at.y - Math.abs(Math.sin(age * 4)) * 5 }
            },
            step: (at, dt) => {
                for(let spark = glints.take(6, dt); spark > 0; spark--) glint(additive, random, at)
            },
            arrived: at => sparkAt(additive, random, at),
        })
    },
}
