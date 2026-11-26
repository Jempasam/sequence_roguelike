import { seededRandom } from "../../../../engine/particles"
import type { Vector2 } from "../../sim/base/Vector2"

import type { FxAnimation, FxEase, FxForm } from "./fxAnimation"
import type { StrikeCut, StrikePlacement } from "./placeStrike"
import { SPRITE_METER } from "./spriteModes"

/** How much of the progress of a blade each copy of its trail lags behind the one before. */
export const TRAIL_STEP = 0.08

/** How far an impact starts back from the unit it lands on, in meters, against the way of the blow. */
export const IMPACT_RECOIL = 0.05

/** How high over its target a falling picture starts, in meters. */
export const FALL_HEIGHT = 1.5

/** How much of the progress of each stroke of a claw the next one lags behind. */
export const CLAW_STEP = 0.08

/** How much of the progress of a rain each fall lags behind the one before, and how much a fall lasts. */
export const RAIN_STEP = 0.1
export const RAIN_SHARE = 0.5

/** How many seeds a blow keeps apart for each of its falls or kinks. */
const RAIN_SEEDS = 64

/** How many times a bolt is kinked again while it plays. */
export const BOLT_REDRAWS = 3

/** The share of the reach of a blow a stab is long, when its picture is sized by the area. */
export const STAB_SHARE = 0.6

/** The forms whose picture is held by its middle: the others are held by the middle of their left edge. */
const CENTERED: readonly FxForm[] = ["slam", "bite", "burst", "shot", "hit"]

/** One picture to draw for a blow at a moment of its life, all sizes in meters of the arena. */
export interface FxDrawing {
    /** Which frame of the picture. */
    readonly frame: number

    /** Where the pixel of the picture held still lies. */
    readonly x: number
    readonly y: number

    /** How far the picture is turned, in radians, as `Math.atan2` gives it. */
    readonly angle: number

    /** How long the drawing is, along its angle. */
    readonly length: number

    /** How wide the drawing is, across its angle, negative to mirror it. */
    readonly width: number

    readonly alpha: number
}

/** The measures of a picture, in pixels. */
export interface FxFrame {
    /** How wide a frame is. */
    readonly width: number
    readonly height: number
}

/** The progress of a blow after its curve, from 0 to 1. */
export function eased(ease: FxEase, share: number): number {
    const t = Math.min(1, Math.max(0, share))
    switch(ease){
        case "in": return t * t
        case "out": return 1 - (1 - t) * (1 - t)
        case "inout": return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)
        default: return t
    }
}

/** How opaque a blow is at a point of its progress: whole until its fade starts. */
export function fadeOf(animation: FxAnimation, t: number): number {
    if(animation.fade <= 0 || t < 1 - animation.fade) return 1
    return Math.max(0, (1 - t) / animation.fade)
}

/** Which frame of a picture shows at a point of the progress of a blow. */
export function frameOf(animation: FxAnimation, t: number): number {
    return Math.min(animation.frames - 1, Math.floor(t * animation.frames))
}

/** The pixel of a picture that stays still: the one its file names, else its middle or its left edge's. */
export function anchorOf(animation: FxAnimation, frame: FxFrame): readonly [number, number] {
    if(animation.anchor) return animation.anchor
    return CENTERED.includes(animation.form) ? [frame.width / 2, frame.height / 2] : [0, frame.height / 2]
}

/** The drawing size of a picture in pixels along and across: what its file says, else a whole frame. */
function drawnPixels(animation: FxAnimation, frame: FxFrame): readonly [number, number] {
    return [animation.length ?? frame.width, animation.width ?? frame.height]
}

/** The sizes a picture has by itself, in meters, the width negative when it is mirrored. */
interface Fixed {
    readonly length: number
    readonly width: number
}

/**
 * What the picture of a blow shows at a moment of it, form by form: where each drawing lies, turned how, how
 * long and wide, and how faint. None for a form that is not played yet, which the area stands in for.
 *
 * @param share - How much of the life of the blow went by, from 0 to 1.
 * @param seed - What the random parts of the blow, the falls of a rain, the kinks of a bolt, are drawn from.
 */
export function strikeDrawings(
    animation: FxAnimation, placement: StrikePlacement, frame: FxFrame, share: number, seed = 0,
): FxDrawing[]|null {
    const t = eased(animation.ease, share)
    const [lengthPixels, widthPixels] = drawnPixels(animation, frame)
    const mirror = animation.flip && placement.forward.x < 0 ? -1 : 1
    const fixed: Fixed = { length: lengthPixels / SPRITE_METER, width: mirror * widthPixels / SPRITE_METER }
    const common = { frame: frameOf(animation, t), alpha: fadeOf(animation, t) }
    switch(animation.form){
        case "sweep": return sweepDrawings(animation, placement, fixed, t)
        case "stab": return stabDrawings(animation, placement, fixed, common, mirror, t)
        case "slam": return slamDrawings(animation, placement, fixed, common, t)
        case "claw": return clawDrawings(animation, placement, fixed, common, t)
        case "bite": return biteDrawings(animation, placement, fixed, common, t)
        case "burst": return burstDrawings(animation, placement, fixed, common, t)
        case "wave": return waveDrawings(placement, fixed, common, t)
        case "shot": return shotDrawings(animation, placement, fixed, common, t)
        case "stretch": return stretchDrawings(animation, placement, fixed, common, mirror, t)
        case "rain": return rainDrawings(animation, placement, fixed, common, t, seed)
        case "bolt": return boltDrawings(animation, placement, fixed, common, t, seed)
        default: return null
    }
}

/** The frame and the fading every drawing of a blow has at a moment of it. */
interface Common {
    readonly frame: number
    readonly alpha: number
}

/** The blade of a `sweep`, turning from one side of its area to the other along the profile of the area. */
function sweepDrawings(
    animation: FxAnimation, placement: StrikePlacement, fixed: Fixed, t: number,
): FxDrawing[] {
    const drawings: FxDrawing[] = []
    for(let copy = 0; copy <= animation.trail; copy++){
        const behind = Math.max(0, t - copy * TRAIL_STEP)
        const angle = -placement.spread + 2 * placement.spread * behind
        const cut = cutAt(placement, angle)
        if(cut === null) continue
        const way = placement.rotation + angle
        const length = animation.size === "fixed" ? fixed.length : cut.outer - cut.inner
        drawings.push({
            frame: frameOf(animation, t),
            x: placement.origin.x + Math.cos(way) * cut.inner,
            y: placement.origin.y + Math.sin(way) * cut.inner,
            angle: way,
            length: length * (animation.size === "target" ? placement.impactScale : 1),
            width: fixed.width,
            alpha: fadeOf(animation, t) * (1 - copy / (animation.trail + 1)),
        })
    }
    return drawings
}

/** A `stab`: the picture slides ahead until its tip reaches the end of the area, then comes back. */
function stabDrawings(
    animation: FxAnimation, placement: StrikePlacement, fixed: Fixed, common: Common, mirror: number,
    t: number,
): FxDrawing[] {
    const { origin, forward, reach, halfWidth } = placement
    const byArea = animation.size === "area"
    const length = byArea ? reach * STAB_SHARE : fixed.length
    const goes = t < 0.5 ? 2 * t : 2 * (1 - t)
    const base = origin.plus(forward.times(Math.max(0, reach - length) * goes))
    return [{
        ...common,
        x: base.x,
        y: base.y,
        angle: placement.rotation,
        length,
        width: byArea ? mirror * 2 * halfWidth : fixed.width,
    }]
}

/** A `slam`: the picture falls on the middle of the area and squashes on it. */
function slamDrawings(
    animation: FxAnimation, placement: StrikePlacement, fixed: Fixed, common: Common, t: number,
): FxDrawing[] {
    const squash = 1 - 0.4 * Math.max(0, t - 0.8) / 0.2
    const scale = animation.size === "area" ? 2 * placement.halfWidth / Math.abs(fixed.length) : 1
    return [{
        ...common,
        x: placement.center.x,
        y: placement.center.y - FALL_HEIGHT * (1 - t * t),
        angle: 0,
        length: fixed.length * scale,
        width: fixed.width * scale * squash,
    }]
}

/** A `claw`: parallel strokes across the area, one after the other. */
function clawDrawings(
    animation: FxAnimation, placement: StrikePlacement, fixed: Fixed, common: Common, t: number,
): FxDrawing[] {
    const { origin, forward, reach, halfWidth } = placement
    const drawings: FxDrawing[] = []
    for(let stroke = 0; stroke < animation.count; stroke++){
        const late = (t - stroke * CLAW_STEP) / (1 - animation.count * CLAW_STEP)
        const progress = Math.min(1, Math.max(0, late))
        if(progress <= 0) continue
        const across = -halfWidth + (stroke + 0.5) * 2 * halfWidth / animation.count
        const at = origin.plus(forward.right.times(across))
        drawings.push({
            ...common,
            x: at.x,
            y: at.y,
            angle: placement.rotation,
            length: reach * progress,
            width: fixed.width,
        })
    }
    return drawings
}

/** A `bite`: the picture, a jaw, twice, closing from either side of the middle of the area. */
function biteDrawings(
    animation: FxAnimation, placement: StrikePlacement, fixed: Fixed, common: Common, t: number,
): FxDrawing[] {
    const { center, halfWidth, forward } = placement
    const gap = halfWidth * (1 - Math.min(1, t / 0.6)) + halfWidth / 2 * Math.max(0, t - 0.8) / 0.2
    const length = animation.size === "area" ? 2 * halfWidth : fixed.length
    return [1, -1].map(way => {
        const at = center.plus(forward.right.times(way * gap))
        return { ...common, x: at.x, y: at.y, angle: placement.rotation, length, width: way * fixed.width }
    })
}

/** A `burst`: the picture on the middle of the area, growing. */
function burstDrawings(
    animation: FxAnimation, placement: StrikePlacement, fixed: Fixed, common: Common, t: number,
): FxDrawing[] {
    const grown = 0.5 + 0.5 * t
    let scale = 1
    if(animation.size === "target") scale = placement.impactScale
    else if(animation.size === "area") scale = 2 * placement.halfWidth / Math.abs(fixed.length)
    return [{
        ...common,
        x: placement.center.x,
        y: placement.center.y,
        angle: 0,
        length: fixed.length * scale * grown,
        width: fixed.width * scale * grown,
    }]
}

/** A `wave`: a picture on each ray of the profile, going out to the edge of the area and fading. */
function waveDrawings(placement: StrikePlacement, fixed: Fixed, common: Common, t: number): FxDrawing[] {
    const drawings: FxDrawing[] = []
    for(const cut of placement.profile){
        if(cut === null) continue
        const way = placement.rotation + cut.angle
        const radius = cut.outer * t
        drawings.push({
            frame: common.frame,
            alpha: common.alpha * (1 - t),
            x: placement.origin.x + Math.cos(way) * radius,
            y: placement.origin.y + Math.sin(way) * radius,
            angle: way,
            length: fixed.length,
            width: fixed.width,
        })
    }
    return drawings
}

/** A `shot`: the picture flies to the end of the area, turning, over a hump when it has an arc. */
function shotDrawings(
    animation: FxAnimation, placement: StrikePlacement, fixed: Fixed, common: Common, t: number,
): FxDrawing[] {
    const hump = 4 * t * (1 - t)
    const at = placement.origin.plus(placement.forward.times(placement.reach * t))
    const bigger = 1 + 0.2 * (animation.arc > 0 ? hump : 0)
    return [{
        ...common,
        x: at.x,
        y: at.y - animation.arc * hump,
        angle: placement.rotation + animation.spin * t * animation.duration * Math.PI / 180,
        length: fixed.length * bigger,
        width: fixed.width * bigger,
    }]
}

/** A `rain`: pictures falling from above on places drawn in the area, one after the other. */
function rainDrawings(
    animation: FxAnimation, placement: StrikePlacement, fixed: Fixed, common: Common, t: number, seed: number,
): FxDrawing[] {
    const cuts = placement.profile.filter(cut => cut !== null)
    if(cuts.length === 0) return []
    const drawings: FxDrawing[] = []
    for(let fall = 0; fall < animation.count; fall++){
        const late = (t - fall * RAIN_STEP) / RAIN_SHARE
        const progress = Math.min(1, Math.max(0, late))
        if(progress <= 0) continue
        const random = seededRandom(seed * RAIN_SEEDS + fall)
        const cut = cuts[Math.floor(random() * cuts.length)]
        const radius = cut.inner + random() * (cut.outer - cut.inner)
        const way = placement.rotation + cut.angle
        drawings.push({
            ...common,
            x: placement.origin.x + Math.cos(way) * radius,
            y: placement.origin.y + Math.sin(way) * radius - FALL_HEIGHT * (1 - progress * progress),
            angle: 0,
            length: fixed.length,
            width: fixed.width,
        })
    }
    return drawings
}

/** A `bolt`: a broken line from the attacker to the end of the area, kinked again three times as it plays. */
function boltDrawings(
    animation: FxAnimation, placement: StrikePlacement, fixed: Fixed, common: Common, t: number, seed: number,
): FxDrawing[] {
    const { origin, forward, reach } = placement
    const side = forward.right
    const tries = Math.min(BOLT_REDRAWS - 1, Math.floor(t * BOLT_REDRAWS))
    const random = seededRandom(seed * RAIN_SEEDS + tries)
    const points: Vector2[] = []
    for(let step = 0; step <= animation.count; step++){
        const along = origin.plus(forward.times(reach * step / animation.count))
        const kink = step === 0 || step === animation.count ? 0 : (random() - 0.5) * 2 * Math.abs(fixed.width)
        points.push(along.plus(side.times(kink)))
    }
    const drawings: FxDrawing[] = []
    for(let step = 0; step < animation.count; step++){
        const gap = points[step + 1].minus(points[step])
        drawings.push({
            ...common,
            x: points[step].x,
            y: points[step].y,
            angle: Math.atan2(gap.y, gap.x),
            length: gap.length,
            width: fixed.width,
        })
    }
    return drawings
}

/** A `stretch`: the picture stretched from the attacker to the end of the area in one go. */
function stretchDrawings(
    animation: FxAnimation, placement: StrikePlacement, fixed: Fixed, common: Common, mirror: number,
    t: number,
): FxDrawing[] {
    const width = animation.size === "area" ? mirror * 2 * placement.halfWidth : fixed.width
    return [{
        ...common,
        x: placement.origin.x,
        y: placement.origin.y,
        angle: placement.rotation,
        length: placement.reach * t,
        width,
    }]
}

/**
 * What the picture of an impact shows at a moment of it, on a unit the blow landed on: laid on it, at the
 * size of its body, a little back from it at first.
 *
 * @param at - Where the unit stands.
 * @param forward - The way of the blow, a meter long.
 * @param scale - How many times larger than a unit of the base size the unit is.
 */
export function impactDrawing(
    animation: FxAnimation, at: Vector2, forward: Vector2, scale: number, frame: FxFrame, share: number,
): FxDrawing {
    const t = eased(animation.ease, share)
    const [lengthPixels, widthPixels] = drawnPixels(animation, frame)
    const back = IMPACT_RECOIL * (1 - t)
    return {
        frame: frameOf(animation, t),
        x: at.x - forward.x * back,
        y: at.y - forward.y * back,
        angle: Math.atan2(forward.y, forward.x),
        length: lengthPixels / SPRITE_METER * scale,
        width: widthPixels / SPRITE_METER * scale * (animation.flip && forward.x < 0 ? -1 : 1),
        alpha: fadeOf(animation, t),
    }
}

/** Where the area lies along a ray at an angle from the way of the blow, from the rays measured around it. */
function cutAt(placement: StrikePlacement, angle: number): StrikeCut|null {
    const { profile, spread } = placement
    if(spread <= 0) return profile[0]
    const place = (angle + spread) / (2 * spread) * profile.length - 0.5
    const clamped = Math.min(profile.length - 1, Math.max(0, place))
    const low = profile[Math.floor(clamped)]
    const high = profile[Math.ceil(clamped)]
    if(low === null || high === null) return null
    const share = clamped - Math.floor(clamped)
    return {
        angle,
        inner: low.inner + (high.inner - low.inner) * share,
        outer: low.outer + (high.outer - low.outer) * share,
    }
}
