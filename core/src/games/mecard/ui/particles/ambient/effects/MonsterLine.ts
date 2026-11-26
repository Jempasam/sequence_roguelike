import type { AmbientEffect } from "../AmbientEffect"
import { outsidePoint, pick, pickTwo, queue } from "../plays"
import { walker } from "./walker"

/** The time between two monsters of the line, in seconds. */
const GAP = 0.9

/** A line of monsters walks one behind the other, from edge to edge or from a fight to another. */
export const MONSTER_LINE: AmbientEffect = {
    id: "monster-line",

    weight: map => map.fights().length >= 2 ? 2 : 0,

    start(map, particles){
        const { random } = particles
        const fights = map.fights()
        const size = map.size()
        const between = random() < 0.5
        const [a, b] = pickTwo(random, fights)
        const from = between ? a.position : outsidePoint(random, size)
        const to = between ? b.position : outsidePoint(random, size, from)
        const sprites = Array.from({ length: 3 + Math.floor(random() * 3) }, () => {
            return map.sprite(pick(random, fights).type.icon)
        }).filter(sprite => sprite !== null)
        if(sprites.length < 3) return null
        return queue(sprites.length, GAP, index => walker({
            particles, sprite: sprites[index], from, to, duration: 7, puff: between,
        }))
    },
}
