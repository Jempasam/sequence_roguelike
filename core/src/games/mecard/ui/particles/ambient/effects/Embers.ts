import type { AmbientEffect } from "../AmbientEffect"
import { Rate } from "../../../../../../engine/particles"
import { rise } from "../../recipes"
import { EMBER_FLOORS } from "../themes"
import { pick, timed } from "../plays"

/** Embers rise from a fight. */
export const EMBERS: AmbientEffect = {
    id: "embers",
    weight: map => map.fights().length > 0 && EMBER_FLOORS.includes(map.floor()) ? 4 : 0,
    start(map, { additive, random }){
        const at = pick(random, map.fights()).position
        const rate = new Rate()
        return timed(4, dt => {
            const count = rate.take(7, dt)
            if(count === 0) return
            rise(additive, random, at, count, { from: 0xffb04a, to: 0xff3a1a, size: 2, life: 1.8 }, 8, 22)
        })
    },
}
