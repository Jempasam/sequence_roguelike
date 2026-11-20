import { Sprite } from "../../gpu"
import type { Painter } from "../../gpu"
import type { Color } from "../../math"

import { Component, internals } from "../Component"
import { Rect } from "../Rect"
import { EMPTY_HINT } from "../SizeHint"
import type { SizeHint } from "../SizeHint"

/**
 * Where a layer lies at rest, in the view of its parallax: a box of 1 by 1 centred on 0, 0, from -0.5 to
 * 0.5, scaled alike on both axes to cover the bounds, so a layer keeps its proportions.
 */
export interface ParallaxPlace {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
}

/** A value of a layer along each axis. */
export interface ParallaxAxes {
    readonly x: number
    readonly y: number
}

/** A layer of a parallax: a picture, and how far it follows the pointer. */
export interface ParallaxLayer {
    readonly sprite: Sprite

    /**
     * How far it moves, in virtual pixels, against the pointer going from the middle to an edge: little for
     * what is far, much for what is near. One number for both axes, or one for each. A layer fitted on its
     * own needs that much room past the bounds on each side of its sprite; a placed one is grown by it.
     */
    readonly depth: number|ParallaxAxes

    /**
     * Where it lies at rest, in the view, grown about its middle by the room its depth takes: none
     * to fit it on its own, its middle on theirs.
     */
    readonly place?: ParallaxPlace

    /**
     * How strongly it bends as it moves, along each axis, none or 0 for not at all: cut in strips, the ones
     * on the side it slides to widen and the others narrow, as if it turned. A negative power bends it the
     * other way; nothing bounds it, but no strip goes thinner than {@link WARP_FLOOR} of its share.
     */
    readonly warp?: ParallaxAxes
}

/** How a parallax is drawn, besides its layers. */
export interface ParallaxOptions {
    /** A hue every layer takes, its light and its saturation kept, none to draw them as they are. */
    readonly tint?: Color|null

    /** How many strips a layer that bends is cut in along each axis, a whole number from 1, 5 by default. */
    readonly warpStrips?: number

    /**
     * Does it cover its whole bounds with opaque pixels, so nothing below is drawn again nor cleared when
     * it changes? Declared, not checked: a placed layer holding too little would leave stale pixels.
     * False by default.
     */
    readonly opaque?: boolean
}

/** How thin a strip of a layer that bends may get, as a share of an even one. */
export const WARP_FLOOR = 0.05

/** How many strips a layer that bends is cut in, when the parallax does not say. */
const WARP_STRIPS = 5

/**
 * The lengths of the strips of a layer that bends, along one axis, from left to right or top to bottom:
 * their sum is the total, each strip weighing `1 + power · c`, `c` going from -1 for the first to 1 for the
 * last, never below {@link WARP_FLOOR}. A power of 0 gives even strips.
 */
export function warpedSpans(total: number, strips: number, power: number): number[] {
    const weights = Array.from({ length: strips }, (_, index) => {
        const side = strips === 1 ? 0 : index / (strips - 1) * 2 - 1
        return Math.max(WARP_FLOOR, 1 + power * side)
    })
    const sum = weights.reduce((a, b) => a + b, 0)
    return weights.map(weight => total * weight / sum)
}

/** A rectangle of a sprite drawn over a rectangle of the screen, both as left, top, width, height. */
interface Mapping {
    sx: number
    sy: number
    sw: number
    sh: number
    dx: number
    dy: number
    dw: number
    dh: number
}

/**
 * A background of pictures laid over one another, each moving against the pointer by its depth, so the
 * near ones move more than the far ones and the scene seems deep. It takes the size it is given, asks
 * none, and is drawn behind the rest: the first child of a stack, stretched.
 *
 * @remarks
 * A layer fitted on its own is drawn at a whole scale, the smallest at which its sprite covers the bounds
 * and the room its depth takes, and only the part of it over the bounds. A placed layer is drawn over
 * its place in the view, which covers the bounds, and only the part of it over the bounds is drawn: one
 * that holds too little leaves a gap, as it was placed. A layer that bends is drawn strip by strip, its
 * outer edges where they would be unbent. Nothing is drawn outside the bounds. It ticks while shown,
 * reading where the pointer is, and draws again only when a layer moved.
 */
export class Parallax extends Component {


    /**
     * @throws {@link Error} When the strips are not a whole number from 1.
     */
    constructor(
        /** The layers, the farthest first. */
        public readonly layers: readonly ParallaxLayer[],
        options: ParallaxOptions = {},
    ){
        super()
        const strips = options.warpStrips ?? WARP_STRIPS
        if(!Number.isInteger(strips) || strips < 1) throw new Error(`A parallax cuts its layers in a whole number of strips from 1, not ${strips}.`)
        this.warpStrips = strips
        this.#tint = options.tint ?? null
        this.opaque = options.opaque ?? false
        this.#shifts = layers.map(() => ({ x: 0, y: 0 }))
        this.#crops = layers.map(() => [])
        this.#bends = layers.some(layer => warpOf(layer).x !== 0 || warpOf(layer).y !== 0)
    }


    /** How many strips a layer that bends is cut in along each axis. */
    public readonly warpStrips: number

    /** The hue every layer takes, none to draw them as they are. */
    public get tint(): Color|null { return this.#tint }

    public set tint(tint: Color|null){
        this.#tint = tint
        this.invalidate()
    }

    /** Does it cover its whole bounds with opaque pixels, as declared? */
    public readonly opaque: boolean

    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    protected override opaqueRect(): Readonly<Rect>|null {
        if(!this.opaque) return null
        return this.#opaqueArea.set(0, 0, this.bounds.width, this.bounds.height)
    }

    /** Start following the pointer, the layers already where it puts them, so the first drawing is right. */
    protected override arranged(): void {
        this.ticking = true
        this.#follow()
    }

    protected override tick(): void {
        if(this.#follow()) this.invalidate()
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        if(width === 0 || height === 0) return
        painter.push()
        if(this.#tint){
            painter.setColorMode("hue")
            painter.setTint(this.#tint)
        }
        for(let index = 0; index < this.layers.length; index++){
            const layer = this.layers[index]
            const mapping = layer.place
                ? this.#placedMapping(index, layer.place, width, height)
                : this.#fittedMapping(index, width, height)
            const warp = warpOf(layer)
            if(warp.x === 0 && warp.y === 0) this.#drawCell(painter, index, 0, mapping, width, height)
            else this.#drawBent(painter, index, mapping, warp, width, height)
        }
        painter.pop()
    }


    #tint: Color|null

    /** Does a layer bend, so the pointer moving changes the drawing even where no shift does? */
    readonly #bends: boolean

    /** How far each layer is moved on the screen now, in virtual pixels: against the pointer. */
    readonly #shifts: { x: number, y: number }[]

    /** Where the pointer is, from -1 on the left or top edge to 1 on the other. */
    readonly #toward = { x: 0, y: 0 }

    /** The parts of each sprite drawn last, by cell, kept while they stay the same, so drawing allocates little. */
    readonly #crops: (Sprite|null)[][]

    readonly #area = new Rect()
    readonly #opaqueArea = new Rect()
    readonly #mapping: Mapping = { sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 }
    readonly #cell: Mapping = { sx: 0, sy: 0, sw: 0, sh: 0, dx: 0, dy: 0, dw: 0, dh: 0 }

    /** Move each layer where the pointer puts it, and say whether the drawing changed. */
    #follow(): boolean {
        const host = internals.shownHostOf(this)
        const area = this.#area
        if(!host || !internals.absoluteArea(this, area) || area.isEmpty) return false
        const along = (pointer: number, start: number, length: number) => {
            return Math.max(-1, Math.min(1, (pointer - start - length / 2) / (length / 2)))
        }
        const towardX = along(host.pointerX, area.x, area.width)
        const towardY = along(host.pointerY, area.y, area.height)
        let moved = this.#bends && (towardX !== this.#toward.x || towardY !== this.#toward.y)
        this.#toward.x = towardX
        this.#toward.y = towardY
        this.layers.forEach((layer, index) => {
            const shift = this.#shifts[index]
            const depth = depthOf(layer)
            const x = -Math.round(towardX * depth.x)
            const y = -Math.round(towardY * depth.y)
            moved ||= x !== shift.x || y !== shift.y
            shift.x = x
            shift.y = y
        })
        return moved
    }

    /** The whole sprite of a placed layer over its place on the screen, grown by its depth, moved by its shift. */
    #placedMapping(index: number, place: ParallaxPlace, width: number, height: number): Mapping {
        const layer = this.layers[index]
        const depth = depthOf(layer)
        const shift = this.#shifts[index]
        // The view, a box of 1 by 1 centred on 0, 0, covers the bounds: scaled by their longest side, then
        // grown about its middle by the room the depth of the layer takes, so its shift shows no edge of it.
        const grownX = (width + 2 * depth.x) / width
        const grownY = (height + 2 * depth.y) / height
        const unit = Math.max(width, height)
        const mapping = this.#mapping
        mapping.sx = 0
        mapping.sy = 0
        mapping.sw = layer.sprite.width
        mapping.sh = layer.sprite.height
        mapping.dx = width / 2 + place.x * unit * grownX + shift.x
        mapping.dy = height / 2 + place.y * unit * grownY + shift.y
        mapping.dw = place.width * unit * grownX
        mapping.dh = place.height * unit * grownY
        return mapping
    }

    /** The part of the sprite of a layer fitted on its own over the bounds, at a whole scale, moved by its shift. */
    #fittedMapping(index: number, width: number, height: number): Mapping {
        const layer = this.layers[index]
        const { sprite } = layer
        const depth = depthOf(layer)
        const shift = this.#shifts[index]
        // The smallest whole scale at which the sprite covers the bounds and the room its depth takes.
        const scaleX = Math.ceil((width + 2 * depth.x) / sprite.width)
        const scale = Math.max(1, scaleX, Math.ceil((height + 2 * depth.y) / sprite.height))
        const cropWidth = Math.min(sprite.width, Math.ceil(width / scale))
        const cropHeight = Math.min(sprite.height, Math.ceil(height / scale))
        const roomX = sprite.width - cropWidth
        const roomY = sprite.height - cropHeight
        const mapping = this.#mapping
        // The crop goes the other way from the layer, so the picture moves by its shift on the screen.
        mapping.sx = clamp(Math.round(roomX / 2 - shift.x / scale), roomX)
        mapping.sy = clamp(Math.round(roomY / 2 - shift.y / scale), roomY)
        mapping.sw = cropWidth
        mapping.sh = cropHeight
        mapping.dx = 0
        mapping.dy = 0
        mapping.dw = width
        mapping.dh = height
        return mapping
    }

    /**
     * Draw a layer strip by strip: its source cut in whole pixels, its place on the screen in the lengths
     * {@link warpedSpans} gives, each cell starting where the one before ends.
     */
    #drawBent(
        painter: Painter, index: number, mapping: Mapping, warp: ParallaxAxes, width: number, height: number,
    ): void {
        const strips = this.warpStrips
        // A layer slides against the pointer: a positive power widens the side it slides to.
        const columns = warpedSpans(mapping.dw, strips, -warp.x * this.#toward.x)
        const rows = warpedSpans(mapping.dh, strips, -warp.y * this.#toward.y)
        const { sx, sy, sw, sh, dx, dy } = mapping
        const cell = this.#cell
        let top = dy
        for(let row = 0; row < strips; row++){
            const sourceTop = sy + Math.round(row * sh / strips)
            const sourceBottom = sy + Math.round((row + 1) * sh / strips)
            let left = dx
            for(let column = 0; column < strips; column++){
                const sourceLeft = sx + Math.round(column * sw / strips)
                const sourceRight = sx + Math.round((column + 1) * sw / strips)
                cell.sx = sourceLeft
                cell.sy = sourceTop
                cell.sw = sourceRight - sourceLeft
                cell.sh = sourceBottom - sourceTop
                cell.dx = left
                cell.dy = top
                cell.dw = columns[column]
                cell.dh = rows[row]
                if(cell.sw > 0 && cell.sh > 0) this.#drawCell(painter, index, row * strips + column, cell, width, height)
                left += columns[column]
            }
            top += rows[row]
        }
    }

    /** Draw a rectangle of the sprite of a layer over a rectangle of the screen, only its part within the bounds. */
    #drawCell(painter: Painter, index: number, cell: number, mapping: Mapping, width: number, height: number): void {
        const { sx, sy, sw, sh, dx, dy, dw, dh } = mapping
        if(dw <= 0 || dh <= 0) return
        const startX = Math.max(0, dx)
        const startY = Math.max(0, dy)
        const endX = Math.min(width, dx + dw)
        const endY = Math.min(height, dy + dh)
        if(endX <= startX || endY <= startY) return
        // The whole pixels of the source under that part.
        const perX = sw / dw
        const perY = sh / dh
        const cropLeft = Math.max(0, Math.floor((startX - dx) * perX))
        const cropTop = Math.max(0, Math.floor((startY - dy) * perY))
        const cropRight = Math.min(sw, Math.ceil((endX - dx) * perX))
        const cropBottom = Math.min(sh, Math.ceil((endY - dy) * perY))
        if(cropRight <= cropLeft || cropBottom <= cropTop) return
        const crop = this.#keptCrop(index, cell, sx + cropLeft, sy + cropTop, cropRight - cropLeft, cropBottom - cropTop)
        painter.push()
        painter.translate(startX, startY)
        painter.scale(spanScale(endX - startX, crop.width), spanScale(endY - startY, crop.height))
        painter.sprite(crop, 0, 0)
        painter.pop()
    }

    /** The part of the sprite of a layer starting there, the one kept for that cell when it is the same. */
    #keptCrop(index: number, cell: number, left: number, top: number, width: number, height: number): Sprite {
        const { sprite } = this.layers[index]
        const crops = this.#crops[index]
        const kept = crops[cell]
        const same = kept && kept.x === sprite.x + left && kept.y === sprite.y + top
            && kept.width === width && kept.height === height
        if(kept && same) return kept
        const crop = new Sprite(sprite.texture, sprite.x + left, sprite.y + top, width, height)
        crops[cell] = crop
        return crop
    }
}

/** The depth of a layer along each axis. */
function depthOf(layer: ParallaxLayer): ParallaxAxes {
    const { depth } = layer
    return typeof depth === "number" ? { x: depth, y: depth } : depth
}

const NO_WARP: ParallaxAxes = { x: 0, y: 0 }

/** How strongly a layer bends along each axis. */
function warpOf(layer: ParallaxLayer): ParallaxAxes {
    return layer.warp ?? NO_WARP
}

/**
 * How much shorter a stretch is made than its span, in virtual pixels: the transforms are computed in
 * 32-bit floats, whose rounding would otherwise reach a hair past the bounds. A thousandth of a pixel.
 */
const SPAN_MARGIN = 1e-3

/** The scale stretching a length over a span, never past it. */
function spanScale(span: number, length: number): number {
    return Math.max(0, span - SPAN_MARGIN) / length
}

/** A value kept from 0 to a highest. */
function clamp(value: number, high: number): number {
    return Math.max(0, Math.min(high, value))
}
