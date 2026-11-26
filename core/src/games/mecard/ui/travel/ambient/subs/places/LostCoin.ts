import type { Effect } from "../../../../../../../engine/animation"
import { lerp } from "../../../../../../../engine/math"
import { follow, pickTwo, Rate } from "../../../../../../../engine/particles"
import { glint, sparkAt } from "../../../../particles/recipes"
import type { AmbientContext } from "../../AmbientContext"
import { AmbientEffect } from "../../AmbientEffect"
import { fightsOf } from "../../placed"

/** Makes a coin that rolls from a fight to another and glints. */
const LOST_COIN_EFFECT: Effect<AmbientContext> = {
    create(context){
        const { alpha, additive, random } = context
        const [from, to] = pickTwo(random, fightsOf(context))
        const coin = context.coin()
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

/** A coin rolls from a fight to another and glints. */
export const LOST_COIN = new AmbientEffect({
    id: "lost-coin",
    spacing: 30,
    stackable: false,
    isPlayable: context => fightsOf(context).length >= 2 && context.coin() !== null,
    weight: () => 2,
    effect: LOST_COIN_EFFECT,
})
