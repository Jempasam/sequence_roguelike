import type { Point } from "../../../../../../engine/math"
import { pick } from "../../../../../../engine/particles"
import type { AmbientContext } from "../AmbientContext"
import type { Places } from "../trip/places"
import type { Range } from "./Grain"
import { between } from "./Grain"

/** How far past the edge of the screen what comes into it is born. */
const TOP = 4
const SIDE = 12

/** How far past the sides what falls from the top may be born. */
const OVERHANG = 20

/** The most times more things are born than at scale 1, however far the space is seen from. */
export const MAX_DENSITY = 2

/**
 * How many times more things are born at a scale, for a spot to look the same: much fewer seen close, more
 * seen from far, up to {@link MAX_DENSITY}.
 *
 * @param dimensions - The ones of the {@link Spot} they are born in.
 */
export function densityAt(scale: number, dimensions: Spot["dimensions"]): number {
    return Math.min(MAX_DENSITY, scale ** -dimensions)
}

/** Where the things of a scene are born. */
export interface Spot {
    /** How it spreads over the space: 0 for the point of a place, 1 for an edge, 2 for a surface. */
    readonly dimensions: 0|1|2

    /** Whether the map holds what the spot needs. */
    playable(context: AmbientContext): boolean

    /** Choose once for a play, then give a point for each thing: none when the map has no such spot. */
    open(context: AmbientContext): (() => Point)|null
}

/** A spot of the screen alone, which every map holds. */
function anywhere(dimensions: Spot["dimensions"], point: (context: AmbientContext) => Point): Spot {
    return {
        dimensions,
        playable: () => true,
        open: context => () => point(context),
    }
}

/** Above the screen, all along its width. */
export function topEdge(): Spot {
    return anywhere(1, context => {
        const { width } = context.size()
        return { x: context.random() * (width + OVERHANG * 2) - OVERHANG, y: -TOP }
    })
}

/** Past the left side of the screen, between two shares of its height. */
export function sideEdge(low = 0, high = 1): Spot {
    return anywhere(1, context => {
        return { x: -SIDE, y: context.size().height * between(context.random, [low, high]) }
    })
}

/** Anywhere on the screen. */
export function screen(): Spot {
    return anywhere(2, context => {
        const { width, height } = context.size()
        return { x: context.random() * width, y: context.random() * height }
    })
}

/** A band of the map shown, between two shares of its height. */
export function band(low: number, high: number): Spot {
    const share: Range = [low, high]
    return anywhere(2, context => {
        const area = context.area()
        return {
            x: area.x + context.random() * area.width,
            y: area.y + area.height * between(context.random, share),
        }
    })
}

/** How a spot lies from its place. */
export interface PlaceOffset {
    readonly x?: number
    readonly y?: number

    /** Is it as likely on the other side of the place? */
    readonly eitherSide?: boolean
}

/** Beside one of the places, drawn once for a play. */
export function atPlace(places: Places, offset: PlaceOffset = {}): Spot {
    return {
        dimensions: 0,
        playable: context => places(context).length > 0,
        open(context){
            const stops = places(context)
            if(stops.length === 0) return null
            const { position } = pick(context.random, stops)
            const side = offset.eitherSide && context.random() < 0.5 ? -1 : 1
            const point = { x: position.x + (offset.x ?? 0) * side, y: position.y + (offset.y ?? 0) }
            return () => point
        },
    }
}
