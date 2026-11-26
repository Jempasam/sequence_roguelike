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

/** Where the things of a scene are born. */
export interface Spot {
    /** Whether the map holds what the spot needs. */
    playable(context: AmbientContext): boolean

    /** Choose once for a play, then give a point for each thing: none when the map has no such spot. */
    open(context: AmbientContext): (() => Point)|null
}

/** A spot of the screen alone, which every map holds. */
function anywhere(point: (context: AmbientContext) => Point): Spot {
    return {
        playable: () => true,
        open: context => () => point(context),
    }
}

/** Above the screen, all along its width. */
export function topEdge(): Spot {
    return anywhere(context => {
        const { width } = context.size()
        return { x: context.random() * (width + OVERHANG * 2) - OVERHANG, y: -TOP }
    })
}

/** Past the left side of the screen, between two shares of its height. */
export function sideEdge(low = 0, high = 1): Spot {
    return anywhere(context => {
        return { x: -SIDE, y: context.size().height * between(context.random, [low, high]) }
    })
}

/** Anywhere on the screen. */
export function screen(): Spot {
    return anywhere(context => {
        const { width, height } = context.size()
        return { x: context.random() * width, y: context.random() * height }
    })
}

/** A band of the map shown, between two shares of its height. */
export function band(low: number, high: number): Spot {
    const share: Range = [low, high]
    return anywhere(context => {
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
