import { together } from "../../../../../../../engine/animation"
import { follow, pick } from "../../../../../../../engine/particles"
import type { Places } from "../../trip/places"
import { between, colorOf, countIn, pictureOf, systemOf } from "../Grain"
import type { Grain, Range } from "../Grain"
import type { Scene } from "../Scene"

/** How fast a being trembles, in radians per second. */
const TREMBLE = 9

/** What makes a swarm. */
export interface SwarmSpec {
    /** The places one of which the beings turn around. */
    readonly around: Places

    readonly grain: Grain
    readonly count: Range

    /** How far from the middle a being goes, in pixels. */
    readonly reach: Range

    /** How fast it turns, in radians per second. */
    readonly speed: Range

    /** The seconds the swarm stays. */
    readonly duration: Range

    /** The height of its way as a share of its width. */
    readonly flatten: number

    /** How high above the place the middle lies, in pixels. */
    readonly lift: number

    /** How many times faster it goes up and down than from side to side: 1.7 by default. */
    readonly weave?: number

    /** How far it trembles, in pixels: not at all by default. */
    readonly jitter?: number

    /** How fast the swarm goes up, in pixels per second. */
    readonly climb?: number
}

/** A few small beings that turn around a place: bats, fireflies, flies, butterflies. */
export function swarm(spec: SwarmSpec): Scene {
    const { around, grain, flatten, lift, weave = 1.7, jitter = 0, climb = 0 } = spec
    return {
        playable: context => around(context).length > 0,
        create(context){
            const sprite = pictureOf(context, grain)
            const stops = around(context)
            if(sprite === undefined || stops.length === 0) return null
            const { random } = context
            const middle = pick(random, stops).position
            const beings = Array.from({ length: countIn(random, spec.count) }, () => {
                const phase = random() * Math.PI * 2
                const reach = between(random, spec.reach)
                const speed = between(random, spec.speed)
                return follow({
                    system: systemOf(context, grain), sprite, size: between(random, grain.size),
                    color: colorOf(random, grain), opacity: grain.opacity,
                    duration: between(random, spec.duration),
                    path: (_progress, age) => ({
                        x: middle.x + Math.cos(age * speed + phase) * reach
                            + Math.sin(age * TREMBLE + phase) * jitter,
                        y: middle.y - lift + Math.sin(age * speed * weave + phase) * reach * flatten
                            - age * climb,
                    }),
                })
            })
            return together(beings)
        },
    }
}
