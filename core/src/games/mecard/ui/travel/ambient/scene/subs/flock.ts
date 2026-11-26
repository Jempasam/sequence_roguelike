import { together } from "../../../../../../../engine/animation"
import { follow } from "../../../../../../../engine/particles"
import type { Random } from "../../../../../../../engine/particles"
import type { Point } from "../../../../../../../engine/math"
import { between, colorOf, countIn, pictureOf, systemOf } from "../Grain"
import type { Grain, Range } from "../Grain"
import type { Scene } from "../Scene"

/** How far past the sides of the map the leader starts and the last one ends. */
const MARGIN = 14

/** How far the whole flock may climb or dive on its way, in pixels. */
const CLIMB = 24

/** How a flock holds together: a V behind its leader, or each as it likes. */
export type Formation = "v"|"loose"

/** What makes a flock. */
export interface FlockSpec {
    readonly grain: Grain
    readonly count: Range
    readonly formation: Formation

    /** The shares of the height of the map between which the leader goes by. */
    readonly band: Range

    /** The seconds the flock takes to cross. */
    readonly duration: number

    /** How far each one goes up and down, in pixels. */
    readonly bob: number
}

/** Where each of a flock flies from the leader, which comes first. */
const FORMATIONS: Record<Formation, (random: Random, index: number, size: number) => Point> = {
    v(random, index, size){
        const rank = Math.ceil(index / 2)
        const side = index % 2 === 0 ? 1 : -1
        return { x: -rank * size * 1.4, y: rank * size * 0.8 * side + between(random, [-2, 2]) }
    },
    loose(random, index, size){
        return { x: -index * size * between(random, [0.6, 1.4]), y: between(random, [-size * 2, size * 2]) }
    },
}

/** Beings that cross the sky of the map together from the left side to the right one: birds, bats. */
export function flock(spec: FlockSpec): Scene {
    const { grain, duration, bob } = spec
    const place = FORMATIONS[spec.formation]
    return {
        playable: () => true,
        create(context){
            const sprite = pictureOf(context, grain)
            if(sprite === undefined) return null
            const { random } = context
            const area = context.area()
            const y = area.y + area.height * between(random, spec.band)
            const climb = between(random, [-CLIMB, CLIMB])
            const members = Array.from({ length: countIn(random, spec.count) }, (_, index) => {
                const size = between(random, grain.size)
                return { size, offset: place(random, index, size), phase: random() * Math.PI * 2 }
            })
            const trail = Math.max(0, ...members.map(member => -member.offset.x))
            const way = area.width + MARGIN * 2 + trail
            return together(members.map(({ size, offset, phase }) => follow({
                system: systemOf(context, grain), sprite, size, color: colorOf(random, grain),
                opacity: grain.opacity, duration,
                path: (progress, age) => ({
                    x: area.x - MARGIN + offset.x + way * progress,
                    y: y + offset.y + climb * progress + Math.sin(age * 4 + phase) * bob,
                }),
            })))
        },
    }
}
