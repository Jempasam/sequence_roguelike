import type { Sprite } from "../../../../../../engine/gpu"
import { Rate } from "../../../../../../engine/particles"
import type { ParticlePoint } from "../../ParticleContext"
import { DUST, radial } from "../../recipes"
import type { AmbientParticles, AmbientPlay } from "../AmbientEffect"
import { follow, lerp } from "../plays"

/** How a monster walks from a point to another. */
export interface Walk {
    readonly particles: AmbientParticles
    readonly sprite: Sprite
    readonly from: ParticlePoint
    readonly to: ParticlePoint

    /** How long the walk takes, in seconds. */
    readonly duration: number

    /** Does it raise a puff of dust where it arrives? Not when it leaves the screen. */
    readonly puff: boolean
}

/** A monster that walks in a line, swaying and hopping, leaving dust behind. */
export function walker(walk: Walk): AmbientPlay {
    const { alpha, random } = walk.particles
    const wobble = random() * Math.PI * 2
    const dust = new Rate()
    return follow({
        system: alpha, sprite: walk.sprite, size: 14, duration: walk.duration,
        path: (progress, age) => {
            const sway = Math.sin(progress * Math.PI * 4 + wobble) * 6 * Math.sin(progress * Math.PI)
            const hop = -Math.abs(Math.sin(age * 7)) * 3
            const at = lerp(walk.from, walk.to, progress)
            return { x: at.x, y: at.y + sway + hop }
        },
        step: (at, dt) => {
            const count = dust.take(8, dt)
            if(count === 0) return
            const grain = { ...DUST, size: 2, end: 4, life: 0.6 }
            radial(alpha, random, { x: at.x, y: at.y + 6 }, count, grain, { speed: 6 })
        },
        arrived: at => {
            if(walk.puff) radial(alpha, random, at, 6, DUST, { speed: 25 })
        },
    })
}
