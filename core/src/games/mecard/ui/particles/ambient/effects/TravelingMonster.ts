import type { AmbientEffect } from "../AmbientEffect"
import { pickTwo } from "../plays"
import { walker } from "./walker"

/** How long the monster takes from a fight to another, in seconds: slow enough to be followed. */
const DURATION = 6

/** A monster of a fight walks to another fight, leaving dust. */
export const TRAVELING_MONSTER: AmbientEffect = {
    id: "traveling-monster",

    weight: map => map.fights().length >= 2 ? 3 : 0,

    start(map, particles){
        const [from, to] = pickTwo(particles.random, map.fights())
        const sprite = map.sprite(from.type.icon)
        if(!sprite) return null
        return walker({
            particles, sprite, from: from.position, to: to.position, duration: DURATION, puff: true,
        })
    },
}
