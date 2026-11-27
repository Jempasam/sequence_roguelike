import { after, queue, together } from "../../../../../../../engine/animation"
import type { Animation } from "../../../../../../../engine/animation"
import type { Sprite } from "../../../../../../../engine/gpu"
import type { Point } from "../../../../../../../engine/math"
import { follow, pick, Rate } from "../../../../../../../engine/particles"
import type { Random } from "../../../../../../../engine/particles"
import type { AmbientContext } from "../../AmbientContext"
import { between, colorOf, countIn, pictureOf, systemOf } from "../Grain"
import type { Grain, Range } from "../Grain"
import { throwJets } from "../Jet"
import type { Jet } from "../Jet"
import type { Scene } from "../Scene"
import { densityAt } from "../Spot"
import type { Spot } from "../Spot"

/** How far above the screen what comes from the sky sets off. */
const SKY = 12

/** How many times a second a swaying thing goes from side to side, in radians. */
const SWAY_SPEED = 3

/**
 * Where a thing of a shower sets off from.
 *
 * @param anchor - The point its spot gave.
 * @param target - Where it arrives: the anchor, scattered around.
 */
export type Origin = (random: Random, anchor: Point, target: Point) => Point

/** From above the screen, moving as many pixels to the right as the slant drawn for each pixel down. */
export function fromSky(slant: Range): Origin {
    return (random, _anchor, target) => {
        return { x: target.x - (target.y + SKY) * between(random, slant), y: -SKY }
    }
}

/** From beside the anchor, as far as drawn on each axis: below it for what rises. */
export function fromBeside(x: Range, y: Range): Origin {
    return (random, anchor) => ({ x: anchor.x + between(random, x), y: anchor.y + between(random, y) })
}

/** The small hop of what bounces where it arrived. */
export interface Bounce {
    readonly height: Range

    /** How far to the right it lands again, in pixels. */
    readonly span: Range

    /** The seconds it takes. */
    readonly duration: number
}

/** What a thing of a shower leaves behind on its way. */
export interface Trail {
    readonly jet: Jet

    /** How many times a second the jet is thrown. */
    readonly rate: number
}

/** What makes a shower. */
export interface ShowerSpec {
    readonly grain: Grain

    /** Where each arrives, drawn for each one. */
    readonly spot: Spot

    /** How far on each side of the point of the spot each may arrive. */
    readonly scatter?: Point

    /** How many a play has at scale 1. */
    readonly count: Range

    /** The seconds between a departure and the next at scale 1. */
    readonly gap: number

    readonly from: Origin

    /** In pixels per second: the time on the way follows from how far it is. */
    readonly speed: Range

    /** Is the picture turned toward its way? */
    readonly turned?: boolean

    /** How far each goes from side to side on its way, in pixels. */
    readonly sway?: number

    readonly trail?: Trail

    /** What may burst where one arrives: one of these is drawn for each. */
    readonly splashes: readonly (readonly Jet[])[]

    readonly bounce?: Bounce

    /** What plays where one arrived, such as the smoke of a crater. */
    readonly remains?: (at: Point) => Scene
}

/** One thing of a shower: its way, what it throws on arriving and what comes after. */
function thing(context: AmbientContext, spec: ShowerSpec, sprite: Sprite|null, anchor: Point): Animation {
    const { random } = context
    const { grain, trail, bounce, remains, sway = 0 } = spec
    const scatter = spec.scatter ?? { x: 0, y: 0 }
    const target = {
        x: anchor.x + between(random, [-scatter.x, scatter.x]),
        y: anchor.y + between(random, [-scatter.y, scatter.y]),
    }
    const start = spec.from(random, anchor, target)
    const dx = target.x - start.x
    const dy = target.y - start.y
    const duration = Math.hypot(dx, dy) / between(random, spec.speed)
    const phase = random() * Math.PI * 2
    const path = (progress: number, age: number): Point => ({
        x: start.x + dx * progress + Math.sin(age * SWAY_SPEED + phase) * sway,
        y: start.y + dy * progress,
    })
    const size = between(random, grain.size)
    const color = colorOf(random, grain)
    const system = systemOf(context, grain)
    const dropped = new Rate()
    const way = follow({
        system, sprite, size, color, opacity: grain.opacity, duration, path,
        rotation: spec.turned ? Math.atan2(dy, dx) : 0,
        step: (at, dt) => {
            if(!trail) return
            for(let n = dropped.take(trail.rate, dt); n > 0; n--) throwJets(context, at, [trail.jet])
        },
        arrived: at => throwJets(context, at, pick(random, spec.splashes)),
    })
    if(!bounce && !remains) return way
    const end = path(1, duration)
    const left: Animation[] = []
    if(bounce){
        const span = between(random, bounce.span)
        const height = between(random, bounce.height)
        left.push(after(duration, () => follow({
            system, sprite, size, color, opacity: grain.opacity, duration: bounce.duration,
            path: progress => ({
                x: end.x + span * progress,
                y: end.y - height * 4 * progress * (1 - progress),
            }),
        })))
    }
    if(remains) left.push(after(duration, () => remains(end).create(context)))
    return together([way, ...left])
}

/**
 * Things that set off one after another and each arrive at a point, where they burst: hail, rockets, bubbles.
 * Seen from far, there are more of them, closer in time.
 */
export function shower(spec: ShowerSpec): Scene {
    const { grain, spot, gap } = spec
    return {
        playable: context => spot.playable(context),
        create(context){
            const sprite = pictureOf(context, grain)
            if(sprite === undefined) return null
            const point = spot.open(context)
            if(!point) return null
            const density = densityAt(context.scale, spot.dimensions)
            const count = Math.max(1, Math.round(countIn(context.random, spec.count) * density))
            return queue(count, gap / density, () => thing(context, spec, sprite, point()))
        },
    }
}
