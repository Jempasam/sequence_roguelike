import type { FloorType } from "../../../../sim/floor/Floor"
import type { AmbientContext } from "../AmbientContext"
import { AmbientEffect } from "../AmbientEffect"
import type { Cast } from "./Cast"
import type { Itinerary } from "./Itinerary"
import { lengthOf } from "./Route"
import type { Traveler } from "./Traveler"

/** The shortest and the longest time of a trip, in seconds. */
const LEAST = 4
const MOST = 16

/** What makes an effect of a trip. */
export interface TripSpec {
    readonly id: string

    /** Where the trip starts and ends. */
    readonly itinerary: Itinerary

    /** Who makes it. */
    readonly cast: Cast

    /** What makes it, and how it goes. */
    readonly traveler: Traveler

    /** Seconds to wait after its end before another of it. */
    readonly spacing: number

    /** How likely it is, relative to the other playable ones. */
    readonly weight: number|((context: AmbientContext) => number)

    /** The floors it plays on, any by default. */
    readonly floors?: readonly FloorType[]
}

/** The effect of a trip: a traveler goes along the way an itinerary draws, led by the cast. */
export function tripEffect(spec: TripSpec): AmbientEffect {
    const { itinerary, cast, traveler } = spec
    return new AmbientEffect({
        id: spec.id,
        spacing: spec.spacing,
        stackable: false,
        isPlayable: context => {
            if(spec.floors && !spec.floors.includes(context.floor())) return false
            return itinerary.playable(context)
        },
        weight: context => typeof spec.weight === "number" ? spec.weight : spec.weight(context),
        effect: {
            create(context){
                const leg = itinerary.draw(context)
                if(!leg) return null
                const anchor = leg.from.place ? leg.from : leg.to.place ? leg.to : null
                const sprites = cast(context, anchor)
                if(!sprites) return null
                const path = leg.route({
                    from: leg.from.position,
                    to: leg.to.position,
                    random: context.random,
                    size: context.size(),
                })
                const duration = Math.min(MOST, Math.max(LEAST, lengthOf(path) / traveler.speed))
                return traveler.start(context, { sprites, path, duration, puff: leg.to.place !== null })
            },
        },
    })
}
