import type { Sprite } from "../../../../../../engine/gpu"
import { pick } from "../../../../../../engine/particles"
import type { ParticleSystem, Random } from "../../../../../../engine/particles"
import type { Visual } from "../../../../sim/base/Visual"
import type { AmbientContext } from "../AmbientContext"

/** The lowest and the highest value something is drawn between. */
export type Range = readonly [number, number]

/** What the things of a scene are made of: a square of color, or a picture tinted by it. */
export interface Grain {
    /** The colors as `0xRRGGBB`, one drawn for each thing: white leaves a picture as it is drawn. */
    readonly colors: readonly number[]

    /** The side of a square, or the width of the picture, in pixels. */
    readonly size: Range

    /** The picture, none for a square. */
    readonly sprite?: Visual

    /** The opacity at its fullest, from 0 to 1: 1 by default. */
    readonly opacity?: number

    /** Does it glow? It then adds up with what lies under it. */
    readonly glow?: boolean
}

/** A value drawn between the ends of a range, without drawing when they are one. */
export function between(random: Random, range: Range): number {
    const [low, high] = range
    return low === high ? low : low + random() * (high - low)
}

/** A whole number drawn between the ends of a range, both included. */
export function countIn(random: Random, range: Range): number {
    const [low, high] = range
    return low === high ? low : low + Math.floor(random() * (high - low + 1))
}

/** The system a grain is drawn by. */
export function systemOf(context: AmbientContext, grain: Grain): ParticleSystem {
    return grain.glow ? context.additive : context.alpha
}

/** One of the colors of a grain. */
export function colorOf(random: Random, grain: Grain): number {
    return grain.colors.length === 1 ? grain.colors[0] : pick(random, grain.colors)
}

/** The picture of a grain: null for a square, undefined while its picture is not loaded. */
export function pictureOf(context: AmbientContext, grain: Grain): Sprite|null|undefined {
    if(!grain.sprite) return null
    return context.sprite(grain.sprite) ?? undefined
}
