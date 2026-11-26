import { once, queue, together } from "../../../../../../../engine/animation"
import { follow } from "../../../../../../../engine/particles"
import { between, colorOf, countIn, pictureOf, systemOf } from "../Grain"
import type { Grain, Range } from "../Grain"
import { throwJets } from "../Jet"
import type { Jet } from "../Jet"
import type { Scene } from "../Scene"
import type { Spot } from "../Spot"

/** What makes a leap. */
export interface LeapSpec {
    readonly grain: Grain
    readonly spot: Spot

    /** How high a bound goes, in pixels. */
    readonly height: Range

    /** How far to the right it lands, in pixels. */
    readonly span: Range

    /** How many bounds a play has. */
    readonly times: Range

    /** The seconds a bound takes. */
    readonly duration: number

    /** The seconds between the start of a bound and the start of the next. */
    readonly gap: number

    /** What bursts where it takes off and where it lands. */
    readonly splash: readonly Jet[]

    /** Does each bound start where the last one landed? Each starts at its own point by default. */
    readonly chained?: boolean

    /** How far it turns over a bound, in radians, from half of it nose up to half of it nose down. */
    readonly dive?: number
}

/** A being that bounds in an arc, once or several times: a fish out of the water, a toad. */
export function leap(spec: LeapSpec): Scene {
    const { grain, spot, duration, gap, splash, dive = 0 } = spec
    return {
        playable: context => spot.playable(context),
        create(context){
            const sprite = pictureOf(context, grain)
            if(sprite === undefined) return null
            const point = spot.open(context)
            if(!point) return null
            const { random } = context
            const size = between(random, grain.size)
            const color = colorOf(random, grain)
            let from = point()
            const bounds = Array.from({ length: countIn(random, spec.times) }, () => {
                const start = from
                const span = between(random, spec.span)
                const height = between(random, spec.height)
                from = spec.chained ? { x: start.x + span, y: start.y } : point()
                return { start, span, height }
            })
            return queue(bounds.length, gap, index => {
                const { start, span, height } = bounds[index]
                return together([
                    once(() => throwJets(context, start, splash)),
                    follow({
                        system: systemOf(context, grain), sprite, size, color, opacity: grain.opacity,
                        duration, rotation: -dive / 2, spin: dive / duration,
                        path: progress => ({
                            x: start.x + span * progress,
                            y: start.y - height * 4 * progress * (1 - progress),
                        }),
                        arrived: at => throwJets(context, at, splash),
                    }),
                ])
            })
        },
    }
}
