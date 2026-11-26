import { timed } from "../../../../../../../engine/animation"
import type { Effect } from "../../../../../../../engine/animation"
import { burst, pick, Rate } from "../../../../../../../engine/particles"
import { BOSS } from "../../../../../sim/fight/fights"
import type { AmbientContext } from "../../AmbientContext"
import { AmbientEffect } from "../../AmbientEffect"
import { fightsOf } from "../../placed"

/** The bosses of the map. */
function bossesOf(context: AmbientContext): ReturnType<typeof fightsOf> {
    return fightsOf(context).filter(fight => fight.type.category === BOSS)
}

/** Makes the red eye that opens over the place of a boss. */
const BOSS_EYE_EFFECT: Effect<AmbientContext> = {
    create(context){
        const { additive, random } = context
        const boss = pick(random, bossesOf(context)).position
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

/** The place of a boss opens a red eye for a moment. */
export const BOSS_EYE = new AmbientEffect({
    id: "boss-eye",
    spacing: 30,
    stackable: false,
    isPlayable: context => bossesOf(context).length > 0,
    weight: () => 2,
    effect: BOSS_EYE_EFFECT,
})
