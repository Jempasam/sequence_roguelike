import { once, queue } from "../../../../../../../engine/animation"
import type { Effect } from "../../../../../../../engine/animation"
import { jagged } from "../../../../../../../engine/math"
import { radial } from "../../../../particles/recipes"
import type { AmbientContext } from "../../AmbientContext"
import { AmbientEffect } from "../../AmbientEffect"
import { STORM_FLOORS } from "../../themes"

/** The time between two strikes, in seconds. */
const GAP = 0.3

/** Makes lightning that strikes the map from the top of the screen, with a flash, sometimes twice. */
const LIGHTNING_EFFECT: Effect<AmbientContext> = {
    create(context){
        const { additive, random } = context
        const { width, height } = context.size()
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

/** Lightning strikes the map from the top of the screen, with a flash, sometimes twice. */
export const LIGHTNING = new AmbientEffect({
    id: "lightning",
    spacing: 20,
    stackable: false,
    isPlayable: context => STORM_FLOORS.includes(context.floor()),
    weight: () => 4,
    effect: LIGHTNING_EFFECT,
})
