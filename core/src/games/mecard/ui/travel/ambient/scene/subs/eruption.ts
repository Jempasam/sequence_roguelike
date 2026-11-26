import { after, once, queue, together } from "../../../../../../../engine/animation"
import type { Animation } from "../../../../../../../engine/animation"
import type { Sprite } from "../../../../../../../engine/gpu"
import type { Point } from "../../../../../../../engine/math"
import { follow } from "../../../../../../../engine/particles"
import type { AmbientContext } from "../../AmbientContext"
import { between, colorOf, pictureOf, systemOf } from "../Grain"
import type { Grain } from "../Grain"
import { throwJets } from "../Jet"
import type { Jet } from "../Jet"
import type { Scene } from "../Scene"
import type { Spot } from "../Spot"

/** The share of the time of a fall after which most of it has landed, when the jets burst. */
const LANDING = 0.85

/** How far a rising shape sways, in pixels. */
const SWAY = 3

/** Shapes that go to the point of an eruption, or out of it. */
export interface Drop {
    readonly grain: Grain
    readonly count: number

    /** How far on each side of the point they may be, in pixels. */
    readonly spread: number

    /** How high above the point they start, below it when negative. A rising one ends that high. */
    readonly height: number

    /** The seconds the slowest one takes. */
    readonly time: number

    /** Do they go up out of the point? They fall onto it by default, faster and faster. */
    readonly rising?: boolean
}

/** What makes an eruption. */
export interface EruptionSpec {
    readonly spot: Spot
    readonly jets: readonly Jet[]

    /** How many times it bursts: once by default. */
    readonly times?: number

    /** The seconds between a burst and the next. */
    readonly gap?: number

    /** What falls before the jets of each burst, or rises along with them. */
    readonly drop?: Drop
}

/** The shapes of a drop going their way. */
function dropped(context: AmbientContext, at: Point, drop: Drop, sprite: Sprite|null): Animation[] {
    const { random } = context
    const { grain, height, spread } = drop
    return Array.from({ length: drop.count }, () => {
        const x = at.x + between(random, [-spread, spread])
        const duration = between(random, [drop.time * 0.75, drop.time])
        return follow({
            system: systemOf(context, grain), sprite, size: between(random, grain.size),
            color: colorOf(random, grain), opacity: grain.opacity, duration,
            path: (progress, age) => drop.rising
                ? { x: x + Math.sin(age * 3) * SWAY, y: at.y - height * progress }
                : { x, y: at.y - height * (1 - progress * progress) },
        })
    })
}

/** Bursts at a point, once or several times: a geyser, a blast, a rockfall. */
export function eruption(spec: EruptionSpec): Scene {
    const { spot, jets, drop, times = 1, gap = 0 } = spec
    return {
        playable: context => spot.playable(context),
        create(context){
            const sprite = drop ? pictureOf(context, drop.grain) : null
            if(sprite === undefined) return null
            const point = spot.open(context)
            if(!point) return null
            const at = point()
            const burst = (): Animation => once(() => throwJets(context, at, jets))
            return queue(times, gap, () => {
                if(!drop) return burst()
                const shapes = dropped(context, at, drop, sprite)
                const jetting = drop.rising ? burst() : after(drop.time * LANDING, burst)
                return together([jetting, ...shapes])
            })
        },
    }
}
