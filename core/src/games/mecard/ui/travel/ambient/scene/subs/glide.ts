import { after, together } from "../../../../../../../engine/animation"
import { follow } from "../../../../../../../engine/particles"
import { between, colorOf, pictureOf, systemOf } from "../Grain"
import type { Grain, Range } from "../Grain"
import type { Scene } from "../Scene"

/** How far past the sides of the screen a shape starts and ends. */
const MARGIN = 60

/** What makes a glide. */
export interface GlideSpec {
    readonly grain: Grain
    readonly count: number

    /** The seconds between a shape and the next one. */
    readonly gap: number

    /** The shares of the height of the screen between which each one goes by. */
    readonly band: Range

    /** The seconds each takes to cross. */
    readonly duration: number

    /** How far it undulates on its way, in pixels. */
    readonly wave?: number

    /** How far it may end above or below where it started, in pixels. */
    readonly slope?: number

    /** The least width of a shape as a share of the width of the screen: wide screens widen them. */
    readonly span?: number
}

/** A few wide shapes that slide from the left side of the screen to the right one: fog, shadows, smoke. */
export function glide(spec: GlideSpec): Scene {
    const { grain, count, gap, duration, wave = 0, slope = 0, span = 0 } = spec
    return {
        playable: () => true,
        create(context){
            const sprite = pictureOf(context, grain)
            if(sprite === undefined) return null
            const { random } = context
            const { width, height } = context.size()
            const shapes = Array.from({ length: count }, (_, index) => {
                const y = height * between(random, spec.band)
                const size = Math.max(between(random, grain.size), width * span)
                const end = between(random, [-slope, slope])
                const color = colorOf(random, grain)
                return after(index * gap, () => follow({
                    system: systemOf(context, grain), sprite, size, color, opacity: grain.opacity, duration,
                    path: progress => ({
                        x: -MARGIN + (width + MARGIN * 2) * progress,
                        y: y + end * progress + Math.sin(progress * 5) * wave,
                    }),
                }))
            })
            return together(shapes)
        },
    }
}
