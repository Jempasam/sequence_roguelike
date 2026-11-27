import type { Sprite } from "../../../../../../engine/gpu"
import type { Point } from "../../../../../../engine/math"
import { burst } from "../../../../../../engine/particles"
import type { AmbientContext, AmbientUnit } from "../AmbientContext"
import { between, colorOf, countIn, systemOf } from "../scene/Grain"
import type { Grain, Range } from "../scene/Grain"

/** Where on a unit something happens. */
export type Anchor = "head"|"mouth"|"middle"|"feet"

/** How far the mouth lies in front of a unit, and how far down from its head, as a share of its height. */
const MOUTH_AHEAD = 5
const MOUTH_DOWN = 0.45

/** The point of a unit an anchor names, as it is shown. */
export function anchorOf({ position, head, facing }: AmbientUnit, anchor: Anchor): Point {
    const height = position.y - head.y
    switch(anchor){
        case "head": return head
        case "mouth": return {
            x: position.x + facing.x * MOUTH_AHEAD,
            y: head.y + height * MOUTH_DOWN + facing.y * MOUTH_AHEAD / 2,
        }
        case "middle": return { x: position.x, y: head.y + height / 2 }
        case "feet": return position
    }
}

/** A few particles born at once on a unit, then left to themselves. Speeds are in pixels per second. */
export interface Puff {
    readonly grain: Grain
    readonly count: Range

    /** The seconds each lives. */
    readonly life: number

    readonly vx?: Range
    readonly vy?: Range

    /** The fall, in pixels per second squared. */
    readonly ay?: Range

    /** The share of the speed lost each second. */
    readonly drag?: number

    /** The speed in the direction the unit faces. */
    readonly forward?: Range

    /** The size at the end of its life: it keeps its size by default. */
    readonly grows?: number

    /** How far from the point it is born, in pixels on each side. */
    readonly scatter?: Point
}

/** Give birth to a puff at a point, fading along its life. */
export function emitPuff(
    context: AmbientContext, puff: Puff, sprite: Sprite|null, at: Point, facing: Point = { x: 0, y: 0 },
): void {
    const { random } = context
    const { grain } = puff
    const scatter = puff.scatter ?? { x: 0, y: 0 }
    burst(systemOf(context, grain), random, at.x, at.y, countIn(random, puff.count), spec => {
        const forward = between(random, puff.forward ?? [0, 0])
        spec.x += between(random, [-scatter.x, scatter.x])
        spec.y += between(random, [-scatter.y, scatter.y])
        spec.vx = between(random, puff.vx ?? [0, 0]) + facing.x * forward
        spec.vy = between(random, puff.vy ?? [0, 0]) + facing.y * forward
        spec.ay = between(random, puff.ay ?? [0, 0])
        spec.drag = puff.drag ?? 0
        spec.life = puff.life
        spec.sizeStart = between(random, grain.size)
        spec.sizeEnd = puff.grows ?? spec.sizeStart
        spec.sprite = sprite
        const color = colorOf(random, grain)
        const [r, g, b] = [(color >> 16 & 255) / 255, (color >> 8 & 255) / 255, (color & 255) / 255]
        spec.colorStart.set(r, g, b, grain.opacity ?? 1)
        spec.colorEnd.set(r, g, b, 0)
    })
}
