import type { AmbientEffect } from "../AmbientEffect"
import { BOSS } from "../../../../sim/fight/fights"
import { burst, Rate } from "../../../../../../engine/particles"
import { pick, timed } from "../plays"

/** The place of a boss opens a red eye for a moment. */
export const BOSS_EYE: AmbientEffect = {
    id: "boss-eye",
    weight: map => map.fights().some(fight => fight.type.category === BOSS) ? 2 : 0,
    start(map, { additive, random }){
        const boss = pick(random, map.fights().filter(fight => fight.type.category === BOSS)).position
        const rate = new Rate()
        return timed(2.4, (dt, age) => {
            const pulse = Math.sin(age / 2.4 * Math.PI)
            burst(additive, random, boss.x, boss.y - 2, rate.take(10 * pulse, dt) * 2, (spec, rand, x) => {
                spec.x = x + (rand() < 0.5 ? -3 : 3)
                spec.life = 0.3
                spec.sizeStart = 2 + pulse * 2
                spec.sizeEnd = 0
                spec.colorStart.set(1, 0.2, 0.15, 1)
                spec.colorEnd.set(1, 0.4, 0.2, 0)
            })
        })
    },
}
