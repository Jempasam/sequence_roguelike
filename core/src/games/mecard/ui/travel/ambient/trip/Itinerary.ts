import { borderPoint } from "../../../../../../engine/math"
import type { Area, Point } from "../../../../../../engine/math"
import { pick } from "../../../../../../engine/particles"
import type { AmbientContext } from "../AmbientContext"
import type { Places } from "./places"
import { loop, wander } from "./Route"
import type { Route } from "./Route"
import type { Stop } from "./Stop"

/** How far past the edge of the screen a trip begins or ends. */
const OFFSCREEN = 24

/** One way to go: from a stop to another, along a route. */
export interface Leg {
    readonly from: Stop
    readonly to: Stop
    readonly route: Route
}

/** What a trip goes through: where it starts and ends, drawn from what the map holds. */
export interface Itinerary {
    /** Whether the map holds what the itinerary needs. */
    playable(context: AmbientContext): boolean

    /** A way to go, none when the map cannot give one. */
    draw(context: AmbientContext): Leg|null
}

/** A point on the border of the map shown, on the side nearest to a point, or on any side. */
function edgeStop(context: AmbientContext, toward?: Point): Stop {
    return { position: borderPoint(context.random, context.area(), toward), place: null }
}

/** Leave a place, stroll around it, and come back to it. */
export function stroll(places: Places): Itinerary {
    return {
        playable: context => places(context).length > 0,
        draw(context){
            const stops = places(context)
            if(stops.length === 0) return null
            const stop = pick(context.random, stops)
            return { from: stop, to: stop, route: loop }
        },
    }
}

/** Leave a place and go out of the map, fading at its border. Only where the edges are open. */
export function leave(places: Places): Itinerary {
    return {
        playable: context => context.openEdges() && places(context).length > 0,
        draw(context){
            const stops = places(context)
            if(!context.openEdges() || stops.length === 0) return null
            const from = pick(context.random, stops)
            return { from, to: edgeStop(context, from.position), route: wander }
        },
    }
}

/** Come into the screen and go into a place. Only where the edges are open. */
export function enter(places: Places): Itinerary {
    return {
        playable: context => context.openEdges() && places(context).length > 0,
        draw(context){
            const stops = places(context)
            if(!context.openEdges() || stops.length === 0) return null
            const to = pick(context.random, stops)
            return { from: edgeStop(context, to.position), to, route: wander }
        },
    }
}

/** Leave a place and go into another: the ends are never one place. */
export function swap(from: Places, to: Places = from): Itinerary {
    const partners = (starts: readonly Stop[], ends: readonly Stop[]): Stop[] => {
        return starts.filter(start => ends.some(end => end.place !== start.place))
    }
    return {
        playable: context => partners(from(context), to(context)).length > 0,
        draw(context){
            const ends = to(context)
            const starts = partners(from(context), ends)
            if(starts.length === 0) return null
            const start = pick(context.random, starts)
            const end = pick(context.random, ends.filter(each => each.place !== start.place))
            return { from: start, to: end, route: wander }
        },
    }
}

/** What a crossing of the screen may be told: its route, and the band of height it crosses by. */
export interface CrossingOptions {
    readonly route?: Route

    /**
     * The share of the height, from 0 to 1, between which it goes from a side to the other. By default it
     * goes from any edge to any other one.
     */
    readonly band?: readonly [number, number]
}

/** Come into the screen by an edge and go out by another, without any place, where the edges are open. */
export function crossing(options: CrossingOptions = {}): Itinerary {
    const route = options.route ?? wander
    return {
        playable: context => context.openEdges(),
        draw(context){
            if(!context.openEdges()) return null
            const { random } = context
            const { width, height } = context.size()
            const { band } = options
            if(band){
                const y = height * (band[0] + random() * (band[1] - band[0]))
                const rightward = random() < 0.5
                return {
                    from: { position: { x: rightward ? -OFFSCREEN : width + OFFSCREEN, y }, place: null },
                    to: { position: { x: rightward ? width + OFFSCREEN : -OFFSCREEN, y }, place: null },
                    route,
                }
            }
            const from = edgeStop(context)
            const side = sideOf(from.position, context.area())
            let to = edgeStop(context)
            for(let attempt = 0; attempt < 8 && sideOf(to.position, context.area()) === side; attempt++){
                to = edgeStop(context)
            }
            return { from, to, route }
        },
    }
}

/** Which edge of an area a point of its border lies on: 0 left, 1 right, 2 top, 3 bottom. */
function sideOf(point: Point, area: Area): number {
    if(point.x === area.x) return 0
    if(point.x === area.x + area.width) return 1
    if(point.y === area.y) return 2
    return 3
}

/** An itinerary that plays only when a condition on the map holds. */
export function when(condition: (context: AmbientContext) => boolean, itinerary: Itinerary): Itinerary {
    return {
        playable: context => condition(context) && itinerary.playable(context),
        draw: context => condition(context) ? itinerary.draw(context) : null,
    }
}

/** Any of some itineraries, drawn at random among those the map allows. */
export function oneOf(...options: readonly Itinerary[]): Itinerary {
    return {
        playable: context => options.some(option => option.playable(context)),
        draw(context){
            const open = options.filter(option => option.playable(context))
            if(open.length === 0) return null
            return pick(context.random, open).draw(context)
        },
    }
}
