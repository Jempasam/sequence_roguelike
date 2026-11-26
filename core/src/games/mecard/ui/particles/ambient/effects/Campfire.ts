import type { AmbientEffect } from "../AmbientEffect"
import { Rate } from "../../../../../../engine/particles"
import { radial, rise } from "../../recipes"
import { REST_HALTS } from "../themes"
import { pick, timed } from "../plays"

const FLAME = { from: 0xffd34d, to: 0xff4a1a, size: 3, end: 0, life: 0.6, lifeSpread: 0.3 }
const SMOKE = { from: 0x8a8a94, to: 0x5a5a66, size: 3, end: 11, life: 2.4, lifeSpread: 0.25 }
const SPARK = { from: 0xffe08a, to: 0xff7a2a, size: 2, life: 0.8 }

/** A campfire burns beside a place of rest, its smoke rising. */
export const CAMPFIRE: AmbientEffect = {
    id: "campfire",

    weight: map => map.halts().some(halt => REST_HALTS.includes(halt.type)) ? 3 : 0,

    start(map, { alpha, additive, random }){
        const halt = pick(random, map.halts().filter(each => REST_HALTS.includes(each.type)))
        const at = { x: halt.position.x + 14, y: halt.position.y + 6 }
        const flames = new Rate()
        const smoke = new Rate()
        const sparks = new Rate()
        return timed(8, (dt, age) => {
            const strength = Math.min(1, age, 8 - age)
            const fire = flames.take(14 * strength, dt)
            if(fire > 0) rise(additive, random, at, fire, FLAME, 3, 24)
            const grey = smoke.take(4 * strength, dt)
            if(grey > 0) rise(alpha, random, { x: at.x, y: at.y - 5 }, grey, SMOKE, 2, 18)
            const spark = sparks.take(2 * strength, dt)
            if(spark > 0) radial(additive, random, at, spark, SPARK, { speed: 35, angle: [-2.4, -0.7] })
        })
    },
}
