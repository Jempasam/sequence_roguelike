import { Sprite } from "../../../../engine/gpu"
import type { Painter } from "../../../../engine/gpu"
import { Mat4 } from "../../../../engine/math"
import { Vector2 } from "../../sim/base/Vector2"
import { Box } from "../../sim/battle/hitbox/Box"
import type { Hitbox } from "../../sim/battle/hitbox/Hitbox"
import { UNIT_RADIUS } from "../../sim/battle/Unit"

import type { HitboxMetrics } from "./hitboxMetrics"
import type { SpriteLook, SpriteMode } from "./spriteLook"

/** How many pixels of the world a meter takes for a sprite to be drawn at its own size. */
export const SPRITE_METER = 12

/** How far below the middle of the body the feet of a sprite stand, in pixels. */
export const FEET_DROP = 1

/** The diameter of the hitbox of a unit of the base size: a sprite drawn for it is a meter wide. */
const BASE_DIAMETER = UNIT_RADIUS * 2

/** The most pieces a repeated picture is cut in, whatever the size of the hitbox. */
const MOST_PIECES = 400

/** Where the arena lies on the screen: what the modes read to turn meters into pixels. */
export interface SpriteView {
    /** How many pixels a meter takes. */
    readonly meter: number

    /** Where a point of the arena lies, in virtual pixels. */
    pixels(point: Vector2): readonly [number, number]
}

/** What a mode draws with. */
interface Drawing {
    readonly painter: Painter
    readonly sprite: Sprite
    readonly metrics: HitboxMetrics
    readonly view: SpriteView

    /** Does the unit face the left? What it draws is mirrored then, never turned upside down. */
    readonly flip: boolean

    /** The middle of the hitbox, in pixels, raised by what the unit floats over the ground. */
    readonly x: number
    readonly y: number
}

/**
 * Draw the picture of a unit over its hitbox, the way its look says, with the tint and the blend the painter
 * has.
 *
 * @param mode - The way to draw it, the look's own unless the caller tries another.
 */
export function drawSprite(
    painter: Painter, sprite: Sprite, mode: SpriteMode, look: SpriteLook, metrics: HitboxMetrics, view: SpriteView,
): void {
    const [x, y] = view.pixels(metrics.center)
    MODES[mode]({ painter, sprite, metrics, view, flip: metrics.direction.x < 0, x, y: y - look.lift * view.meter })
}

/** The way a unit is drawn: the one its look names, else standing for a round body and covering for a box. */
export function modeOf(look: SpriteLook, hitbox: Hitbox): SpriteMode {
    return look.mode ?? (hitbox instanceof Box ? "cover" : "feet")
}

/** How high over the middle of the body a drawn picture reaches, in pixels: where what goes over it stands. */
export function spriteReach(
    sprite: Sprite, mode: SpriteMode, look: SpriteLook, metrics: HitboxMetrics, view: SpriteView,
): number {
    const lift = look.lift * view.meter
    if(mode === "feet") return standingHeight(sprite, metrics, view) + lift
    if(mode === "center") return sprite.height * standingScale(metrics, view) / 2 + lift
    return metrics.outer / 2 * view.meter + lift
}

/** How large a picture is drawn standing or centered: a unit of the base size has the one it was drawn at. */
export function standingScale(metrics: HitboxMetrics, view: SpriteView): number {
    return metrics.outer / BASE_DIAMETER * view.meter / SPRITE_METER
}

/** How high over the middle of the body a picture drawn standing on it reaches, in pixels. */
export function standingHeight(sprite: Sprite, metrics: HitboxMetrics, view: SpriteView): number {
    return sprite.height * standingScale(metrics, view) - FEET_DROP
}

const MODES: Readonly<Record<SpriteMode, (drawing: Drawing) => void>> = {
    feet: drawFeet,
    center: drawCenter,
    cover: drawCover,
    wall: drawWall,
    repeat: drawRepeat,
    tile: drawTile,
    spin: drawSpin,
    capped: drawCapped,
}

/** The bottom of the picture on the position. */
function drawFeet(drawing: Drawing): void {
    const { metrics, view, x, y } = drawing
    standAt(drawing, x, y, standingScale(metrics, view))
}

/** The picture centered on the position. */
function drawCenter(drawing: Drawing): void {
    const { sprite, metrics, view, x, y } = drawing
    const scale = standingScale(metrics, view)
    standAt(drawing, x, y - FEET_DROP + sprite.height * scale / 2, scale)
}

/** The picture turned with the hitbox and stretched over its bounding box. */
function drawCover(drawing: Drawing): void {
    const { painter, sprite, metrics, view } = drawing
    flat(drawing, () => {
        painter.scale(metrics.length * view.meter / sprite.width, metrics.width * view.meter / sprite.height)
        painter.sprite(sprite, -sprite.width / 2, -sprite.height / 2)
    })
}

/** The picture centered, turned the way the unit faces. */
function drawSpin(drawing: Drawing): void {
    const { painter, sprite, metrics, view, x, y } = drawing
    const scale = standingScale(metrics, view)
    painter.push()
    painter.translate(x, y)
    painter.rotate(Math.atan2(metrics.direction.y, metrics.direction.x))
    painter.scale(scale)
    painter.sprite(sprite, -sprite.width / 2, -sprite.height / 2)
    painter.pop()
}

/** The picture repeated over the bounding box, each piece as large as the picture is by nature. */
function drawTile(drawing: Drawing): void {
    const { painter, sprite, metrics, view } = drawing
    const length = metrics.length * view.meter
    const width = metrics.width * view.meter
    const across = Math.max(1, Math.round(length / (sprite.width * view.meter / SPRITE_METER)))
    const down = Math.max(1, Math.round(width / (sprite.height * view.meter / SPRITE_METER)))
    if(across * down > MOST_PIECES) return drawCover(drawing)
    const cell = [length / across, width / down]
    flat(drawing, () => {
        for(let i = 0; i < across; i++){
            for(let j = 0; j < down; j++){
                painter.push()
                painter.translate(-length / 2 + i * cell[0], -width / 2 + j * cell[1])
                painter.scale(cell[0] / sprite.width, cell[1] / sprite.height)
                painter.sprite(sprite, 0, 0)
                painter.pop()
            }
        }
    })
}

/**
 * The picture standing as often as the long side of the bounding box takes it, as wide as the short side, so a
 * line of posts or a group of bushes follows the hitbox.
 */
function drawRepeat(drawing: Drawing): void {
    const { sprite, metrics, view, y } = drawing
    const along = metrics.length >= metrics.width ? metrics.direction : metrics.direction.right
    const long = Math.max(metrics.length, metrics.width)
    const short = Math.min(metrics.length, metrics.width)
    const count = Math.min(MOST_PIECES, Math.max(1, Math.round(long / short)))
    const scale = Math.max(short, 0.1) * view.meter / sprite.width
    const raised = view.pixels(metrics.center)[1] - y
    const spots = Array.from({ length: count }, (_, index) => {
        const offset = (index + 0.5) / count * long - long / 2
        const [px, py] = view.pixels(metrics.center.plus(along.times(offset)))
        return [px, py - raised] as const
    })
    // Back to front, so what is nearer covers what is behind.
    for(const [px, py] of spots.sort((a, b) => a[1] - b[1])) standAt(drawing, px, py, scale)
}

/** A start, a middle drawn as often as it takes and an end, along the bounding box. */
function drawCapped(drawing: Drawing): void {
    const { painter, sprite, metrics, view } = drawing
    const parts = slicesOf(sprite)
    const length = metrics.length * view.meter
    const width = metrics.width * view.meter
    const scale = width / sprite.height
    const capWidth = parts.capped.start.width * scale
    const space = length - 2 * capWidth
    const middle = parts.capped.middle
    flat(drawing, () => {
        painter.push()
        painter.translate(-length / 2, -width / 2)
        if(space <= 0){
            const half = length / 2
            painter.push()
            painter.scale(half / parts.capped.start.width, width / sprite.height)
            painter.sprite(parts.capped.start, 0, 0)
            painter.pop()
            painter.translate(half, 0)
            painter.scale(half / parts.capped.end.width, width / sprite.height)
            painter.sprite(parts.capped.end, 0, 0)
            painter.pop()
            return
        }
        const count = Math.min(MOST_PIECES, Math.max(1, Math.round(space / (middle.width * scale))))
        const piece = space / count
        painter.push()
        painter.scale(scale)
        painter.sprite(parts.capped.start, 0, 0)
        painter.pop()
        for(let i = 0; i < count; i++){
            painter.push()
            painter.translate(capWidth + i * piece, 0)
            painter.scale(piece / middle.width, width / sprite.height)
            painter.sprite(middle, 0, 0)
            painter.pop()
        }
        painter.translate(length - capWidth, 0)
        painter.scale(scale)
        painter.sprite(parts.capped.end, 0, 0)
        painter.pop()
    })
}

/** A side of a wall that looks toward the viewer, where its foot lies on the screen. */
export interface WallFace {
    /** The long side or the short one of the bounding box: which part of the picture it is drawn from. */
    readonly kind: "long"|"short"

    /** The left and the right end of its foot, in pixels. */
    readonly left: readonly [number, number]
    readonly right: readonly [number, number]

    /** From its foot to the other side of the box, away from the viewer: where the top of the wall lies behind it. */
    readonly back: readonly [number, number]

    /** Is its picture drawn from right to left? Both faces are, when the short one shows left of the long one. */
    readonly mirrored: boolean
}

/**
 * The sides of a bounding box that look down the screen, so show: one when it is straight, two when turned. The
 * picture of the long side ends where the picture of the short side starts, so the short side must lie on the
 * right of the long one, and when it lies on the left both are mirrored.
 *
 * @param x - Where the middle of the box is on the screen, in pixels.
 */
export function wallFaces(metrics: HitboxMetrics, view: SpriteView, x: number, y: number): WallFace[] {
    const along = metrics.direction
    const across = metrics.direction.right
    const [mx, my] = view.pixels(metrics.center)
    const shift = (point: Vector2): readonly [number, number] => {
        const [px, py] = view.pixels(point)
        return [px - mx + x, py - my + y]
    }
    const longest = Math.max(metrics.length, metrics.width)
    // The four sides: where each looks, how far it lies from the middle, which way it runs and how long it is.
    const sides = [
        { looks: along, reach: metrics.length / 2, runs: across, size: metrics.width },
        { looks: along.times(-1), reach: metrics.length / 2, runs: across, size: metrics.width },
        { looks: across, reach: metrics.width / 2, runs: along, size: metrics.length },
        { looks: across.times(-1), reach: metrics.width / 2, runs: along, size: metrics.length },
    ]
    type Placed = Omit<WallFace, "mirrored">
    const faces: Placed[] = []
    for(const { looks, reach, runs, size } of sides){
        // Only the sides that look toward the viewer, down the screen, show.
        if(looks.y <= 1e-6) continue
        const middle = metrics.center.plus(looks.times(reach))
        const first = shift(middle.minus(runs.times(size / 2)))
        const second = shift(middle.plus(runs.times(size / 2)))
        const [left, right] = first[0] <= second[0] ? [first, second] : [second, first]
        if(right[0] - left[0] < 1e-6) continue
        const behind = shift(metrics.center.minus(looks.times(reach)))
        const front = shift(middle)
        faces.push({
            kind: size >= longest ? "long" : "short", left, right, back: [behind[0] - front[0], behind[1] - front[1]],
        })
    }
    const middleOf = (face: Placed) => face.left[0] + face.right[0]
    const long = faces.find(face => face.kind === "long")
    const short = faces.find(face => face.kind === "short")
    const mirrored = long !== undefined && short !== undefined && middleOf(short) < middleOf(long)
    return faces.map(face => ({ ...face, mirrored }))
}

/**
 * A wall seen from the front: the top third of the picture lies on the bounding box, raised by the height of
 * the wall, and the faces that look toward the viewer hang under it, the long one from the left two thirds of
 * what is left, the short one from its right third. The faces are the view's, not the unit's: the picture is not
 * mirrored with the way the unit faces. The long and the short face meet at a corner of the picture; when the
 * wall is turned so the short one shows on the left of the long one, both are mirrored, so they still meet there.
 * The top is laid on the long face the same way: its bottom edge is the top edge of that face, going its way.
 */
function drawWall(drawing: Drawing): void {
    const { painter, sprite, metrics, view, x, y } = drawing
    const { top, long, short } = slicesOf(sprite).wall
    const height = (sprite.height - top.height) / SPRITE_METER * view.meter
    const faces = wallFaces(metrics, view, x, y)
    for(const face of faces){
        const slice = face.kind === "long" ? long : short
        const [from, to] = wallFaceEnds(face)
        affine(painter, from[0], from[1] - height,
            (to[0] - from[0]) / slice.width, (to[1] - from[1]) / slice.width, 0, height / slice.height)
        painter.sprite(slice, 0, 0)
        painter.pop()
    }
    // The top lies on the face the long picture hangs from, its bottom edge right over the foot of it and going the
    // same way, so the picture goes on from the top onto the face, mirrored with it.
    const front = faces.find(face => face.kind === "long") ?? faces[0]
    if(!front) return
    const [from, to] = wallFaceEnds(front)
    affine(painter, from[0] + front.back[0], from[1] + front.back[1] - height,
        (to[0] - from[0]) / top.width, (to[1] - from[1]) / top.width,
        -front.back[0] / top.height, -front.back[1] / top.height)
    painter.sprite(top, 0, 0)
    painter.pop()
}

/** The end of the foot of a face its picture starts from, then the one it ends at: right to left when mirrored. */
function wallFaceEnds(face: WallFace): readonly [readonly [number, number], readonly [number, number]] {
    return face.mirrored ? [face.right, face.left] : [face.left, face.right]
}

/**
 * A picture standing on a point of the screen, its feet there, mirrored when the unit faces left.
 *
 * @param scale - How many pixels of the screen a pixel of the picture takes.
 */
function standAt(drawing: Drawing, x: number, y: number, scale: number): void {
    const { painter, sprite, flip } = drawing
    const width = sprite.width * scale
    const left = Math.round(x - width / 2)
    const top = Math.round(y + FEET_DROP - sprite.height * scale)
    painter.push()
    painter.translate(flip ? left + width : left, top)
    painter.scale(flip ? -scale : scale, scale)
    painter.sprite(sprite, 0, 0)
    painter.pop()
}

/**
 * Draw in the frame of the bounding box: its middle at the origin, its length along x, its width along y.
 * A unit facing left is drawn mirrored along a frame turned the other way, so the picture is never upside down.
 */
function flat(drawing: Drawing, draw: () => void): void {
    const { painter, metrics, flip, x, y } = drawing
    const way = flip ? metrics.direction.times(-1) : metrics.direction
    painter.push()
    painter.translate(x, y)
    painter.rotate(Math.atan2(way.y, way.x))
    painter.scale(flip ? -1 : 1, 1)
    draw()
    painter.pop()
}

/** The matrix that maps the pixels of a picture onto a parallelogram of the screen, pushed over the painter's. */
function affine(painter: Painter, x: number, y: number, ux: number, uy: number, vx: number, vy: number): void {
    const { elements } = SCRATCH.identity()
    elements[0] = ux
    elements[1] = uy
    elements[4] = vx
    elements[5] = vy
    elements[12] = x
    elements[13] = y
    painter.push()
    painter.transform(SCRATCH)
}

const SCRATCH = new Mat4()

/** The pieces a picture is cut in, kept by picture so a frame makes none. */
interface Slices {
    readonly wall: { readonly top: Sprite, readonly long: Sprite, readonly short: Sprite }
    readonly capped: { readonly start: Sprite, readonly middle: Sprite, readonly end: Sprite }
}

const CUT = new WeakMap<Sprite, Slices>()

/** A piece of a picture, in whole texels, at least one wide and high. */
function piece(sprite: Sprite, x: number, y: number, width: number, height: number): Sprite {
    return new Sprite(sprite.texture, sprite.x + x, sprite.y + y, Math.max(1, width), Math.max(1, height))
}

function slicesOf(sprite: Sprite): Slices {
    const known = CUT.get(sprite)
    if(known) return known
    const { width, height } = sprite
    const topHeight = Math.max(1, Math.round(height / 3))
    const longWidth = Math.min(Math.max(1, Math.round(width * 2 / 3)), Math.max(1, width - 1))
    const third = Math.max(1, Math.floor(width / 3))
    const cut: Slices = {
        wall: {
            top: piece(sprite, 0, 0, width, topHeight),
            long: piece(sprite, 0, topHeight, longWidth, height - topHeight),
            short: piece(sprite, longWidth, topHeight, width - longWidth, height - topHeight),
        },
        capped: {
            start: piece(sprite, 0, 0, third, height),
            middle: piece(sprite, third, 0, width - 2 * third, height),
            end: piece(sprite, width - third, 0, third, height),
        },
    }
    CUT.set(sprite, cut)
    return cut
}
