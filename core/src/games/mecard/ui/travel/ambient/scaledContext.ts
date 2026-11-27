import type { Point } from "../../../../../engine/math"
import type { AmbientContext } from "./AmbientContext"

/** The steps a scale is rounded to, and the least it may be. */
const SCALE_STEP = 0.5

/** The scale an ambient is drawn at: the nearest half step, so its pixels stay even. */
export function roundedScale(scale: number): number {
    return Math.max(SCALE_STEP, Math.round(scale / SCALE_STEP) * SCALE_STEP)
}

/**
 * A space as the effects see it: every length and position divided by its rounded scale. What they draw is
 * then scaled back, so their sizes, speeds and margins follow the scale without knowing it.
 */
export function scaledContext(context: AmbientContext): AmbientContext {
    const down = ({ x, y }: Point): Point => {
        const scale = roundedScale(context.scale)
        return { x: x / scale, y: y / scale }
    }
    return {
        alpha: context.alpha,
        additive: context.additive,
        random: context.random,
        get scale(){ return roundedScale(context.scale) },
        enabled: () => context.enabled(),
        settled: () => context.settled(),
        scene: () => context.scene(),
        outdoors: () => context.outdoors(),
        openEdges: () => context.openEdges(),
        floor: () => context.floor(),
        sprite: visual => context.sprite(visual),
        coin: () => context.coin(),
        units: () => context.units().map(each => {
            return { ...each, position: down(each.position), head: down(each.head) }
        }),
        places: () => context.places().map(each => ({ ...each, position: down(each.position) })),
        size: () => {
            const { width, height } = context.size()
            const { x, y } = down({ x: width, y: height })
            return { width: x, height: y }
        },
        area: () => {
            const area = context.area()
            const corner = down(area)
            const size = down({ x: area.width, y: area.height })
            return { x: corner.x, y: corner.y, width: size.x, height: size.y }
        },
        heroPosition: () => {
            const position = context.heroPosition()
            return position ? down(position) : null
        },
    }
}
