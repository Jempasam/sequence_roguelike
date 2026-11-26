import type { Effect } from "../../../../../../../engine/animation"
import { follow, pick } from "../../../../../../../engine/particles"
import type { AmbientContext } from "../../AmbientContext"
import { AmbientEffect } from "../../AmbientEffect"
import { fightsOf } from "../../placed"

/** How long the ghost stays, in seconds. */
const DURATION = 8

/** Makes the ghost of a monster of a fight already won: it drifts to the party and circles it, pale. */
const DEFEATED_GHOST_EFFECT: Effect<AmbientContext> = {
    create(context){
        const { alpha, random } = context
        const hero = context.heroPosition()
        const beaten = fightsOf(context).filter(fight => fight.visited)
        if(!hero || beaten.length === 0) return null
        const from = pick(random, beaten)
        const sprite = context.sprite(from.type.icon)
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

/** The monster of a fight already won rises, drifts to the party and circles it, pale. */
export const DEFEATED_GHOST = new AmbientEffect({
    id: "defeated-ghost",
    spacing: 30,
    stackable: false,
    isPlayable: context => context.heroPosition() !== null && fightsOf(context).some(fight => fight.visited),
    weight: () => 2,
    effect: DEFEATED_GHOST_EFFECT,
})
