import type { AmbientEffect } from "../AmbientEffect"
import { outsidePoint, pick } from "../plays"
import { walker } from "./walker"

/** A monster of a fight leaves the screen, or comes into it from outside to a fight. */
export const MONSTER_PASSING: AmbientEffect = {
    id: "monster-passing",

    weight: map => map.fights().length > 0 ? 3 : 0,

    start(map, particles){
        const { random } = particles
        const fight = pick(random, map.fights())
        const sprite = map.sprite(fight.type.icon)
        if(!sprite) return null
        const outside = outsidePoint(random, map.size(), fight.position)
        const arriving = random() < 0.5
        return walker({
            particles, sprite, duration: 7, puff: arriving,
            from: arriving ? outside : fight.position,
            to: arriving ? fight.position : outside,
        })
    },
}
