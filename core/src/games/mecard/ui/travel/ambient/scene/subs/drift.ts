import { timed } from "../../../../../../../engine/animation"
import type { Sprite } from "../../../../../../../engine/gpu"
import type { Point } from "../../../../../../../engine/math"
import { burst, Rate } from "../../../../../../../engine/particles"
import type { ParticleSpec, Random } from "../../../../../../../engine/particles"
import { between, colorOf, pictureOf, systemOf } from "../Grain"
import type { Grain, Range } from "../Grain"
import type { Scene } from "../Scene"
import { densityAt } from "../Spot"
import type { Spot } from "../Spot"

/** One sort of thing a drift emits, and how it moves. Speeds are in pixels per second. */
export interface Layer {
    readonly grain: Grain

    /** How many are born each second. */
    readonly rate: number

    /** The seconds each lives. */
    readonly life: number

    /** The share of the life it varies by, 0 for none. */
    readonly lifeSpread?: number

    readonly vx?: Range
    readonly vy?: Range

    /** The accelerations, in pixels per second squared: a wind, a gravity. */
    readonly ax?: Range
    readonly ay?: Range

    /** The share of the speed lost each second. */
    readonly drag?: number

    /** The seconds to cross the width of the screen: it gives the horizontal speed in place of `vx`. */
    readonly cross?: Range

    /** The turn each second, in radians. */
    readonly spin?: Range

    /** The size at the end of its life: it keeps its size by default. */
    readonly grows?: number

    /** The color at the end of its life: it keeps its color by default. */
    readonly turns?: number

    /** Does it fade away along its life? It keeps its opacity by default. */
    readonly fades?: boolean

    /** Does it turn toward its motion? */
    readonly stretched?: boolean

    /** How far from the point of the spot it is born, in pixels on each side. */
    readonly scatter?: Point

    /** Where it is born from the point of the spot. */
    readonly offset?: Point
}

/** What makes a drift. */
export interface DriftSpec {
    readonly spot: Spot
    readonly layers: readonly Layer[]

    /** The seconds things are born for. */
    readonly duration: number

    /** Is it as likely to go the other way, from right to left? Drawn once for a play. */
    readonly mirrored?: boolean

    /** The seconds it takes to swell at its start and to die down at its end: at once by default. */
    readonly swell?: number
}

/** Set a color from `0xRRGGBB` and an alpha. */
function paint(color: ParticleSpec["colorStart"], hex: number, alpha: number): void {
    color.set((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255, alpha)
}

/**
 * Give a particle born at a point the motion and the look of its layer.
 *
 * @param width - The width of the screen at scale 1, which a layer crossing it is timed on.
 * @param lasting - How many times its life it lives.
 */
function dress(
    spec: ParticleSpec, random: Random, layer: Layer, sprite: Sprite|null, width: number, lasting: number,
): void {
    const { grain } = layer
    const scatter = layer.scatter ?? { x: 0, y: 0 }
    spec.x += (layer.offset?.x ?? 0) + between(random, [-scatter.x, scatter.x])
    spec.y += (layer.offset?.y ?? 0) + between(random, [-scatter.y, scatter.y])
    spec.vx = layer.cross ? width / between(random, layer.cross) : between(random, layer.vx ?? [0, 0])
    spec.vy = between(random, layer.vy ?? [0, 0])
    spec.ax = between(random, layer.ax ?? [0, 0])
    spec.ay = between(random, layer.ay ?? [0, 0])
    spec.drag = layer.drag ?? 0
    const spread = layer.lifeSpread ?? 0
    spec.life = layer.life * lasting * (1 + between(random, [-spread, spread]))
    spec.sizeStart = between(random, grain.size)
    spec.sizeEnd = layer.grows ?? spec.sizeStart
    spec.spin = between(random, layer.spin ?? [0, 0])
    spec.faceMotion = layer.stretched ?? false
    spec.sprite = sprite
    const color = colorOf(random, grain)
    const opacity = grain.opacity ?? 1
    paint(spec.colorStart, color, opacity)
    paint(spec.colorEnd, layer.turns ?? color, layer.fades ? 0 : opacity)
}

/** Things born one after another that fall, rise or are blown by the wind: weather, smoke, sparks. */
export function drift(spec: DriftSpec): Scene {
    const { spot, layers, duration, swell = 0 } = spec
    return {
        playable: context => spot.playable(context),
        create(context){
            const pictures = layers.map(layer => pictureOf(context, layer.grain))
            if(pictures.includes(undefined)) return null
            const point = spot.open(context)
            if(!point) return null
            const { random } = context
            const { width } = context.size()
            const flipped = spec.mirrored === true && random() < 0.5
            const rates = layers.map(() => new Rate())
            return timed(duration, (dt, age) => {
                const swelling = Math.min(1, age / swell, (duration - age) / swell)
                const strength = swell > 0 ? Math.max(0, swelling) : 1
                const { scale } = context
                const density = densityAt(scale, spot.dimensions)
                // What comes from an edge goes across the space: seen from far, it lives longer to get there.
                const lasting = spot.dimensions === 1 ? Math.max(1, 1 / scale) : 1
                layers.forEach((layer, index) => {
                    const count = rates[index].take(layer.rate * strength * density, dt)
                    for(let n = 0; n < count; n++){
                        const born = point()
                        burst(systemOf(context, layer.grain), random, born.x, born.y, 1, particle => {
                            dress(particle, random, layer, pictures[index] ?? null, width * scale, lasting)
                            if(!flipped) return
                            particle.x = width - particle.x
                            particle.vx = -particle.vx
                            particle.ax = -particle.ax
                        })
                    }
                })
            })
        },
    }
}
