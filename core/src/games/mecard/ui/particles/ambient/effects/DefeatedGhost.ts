import type { AmbientEffect } from "../AmbientEffect"
import { follow, pick } from "../plays"

/** How long the ghost stays, in seconds. */
const DURATION = 8

/** The monster of a fight already won rises, drifts to the party and circles it, pale. */
export const DEFEATED_GHOST: AmbientEffect = {
    id: "defeated-ghost",
    weight: map => map.heroPosition() && map.fights().some(fight => fight.visited) ? 2 : 0,
    start(map, { alpha, random }){
        const hero = map.heroPosition()
        const beaten = map.fights().filter(fight => fight.visited)
        if(!hero || beaten.length === 0) return null
        const from = pick(random, beaten)
        const sprite = map.sprite(from.type.icon)
        if(!sprite) return null
        const phase = random() * Math.PI * 2
        return follow({
            system: alpha, sprite, size: 12, color: 0xbfd8ff, opacity: 0.45, duration: DURATION,
            path: (progress, age) => {
                const arrival = Math.min(1, progress * 2.5)
                const orbit = 26 * arrival
                const x = from.position.x + (hero.x - from.position.x) * arrival
                const y = from.position.y + (hero.y - from.position.y) * arrival
                return {
                    x: x + Math.cos(age + phase) * orbit,
                    y: y + Math.sin(age + phase) * orbit * 0.5 - progress * 10,
                }
            },
        })
    },
}
