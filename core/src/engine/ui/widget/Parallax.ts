import { Sprite } from "../../gpu"
import type { Painter } from "../../gpu"

import { Component, internals } from "../Component"
import { Rect } from "../Rect"
import { EMPTY_HINT } from "../SizeHint"
import type { SizeHint } from "../SizeHint"

/** A layer of a parallax: a picture, and how far it follows the pointer. */
export interface ParallaxLayer {
    readonly sprite: Sprite

    /**
     * How far it moves, in virtual pixels, against the pointer going from the middle to an edge: little for
     * what is far, much for what is near. Its sprite needs that much room past the bounds on each side.
     */
    readonly depth: number
}

/**
 * A background of pictures laid over one another, each moving against the pointer by its depth, so the
 * near ones move more than the far ones and the scene seems deep. It takes the size it is given, asks
 * none, and is drawn behind the rest: the first child of a stack, stretched.
 *
 * @remarks
 * A layer is drawn at a whole scale, the smallest at which its sprite covers the bounds and the room its
 * depth takes, and only the part of it over the bounds: nothing is drawn outside them. A sprite too narrow
 * at every whole scale is stretched by a fraction, as a last resort. It ticks while shown, reading where
 * the pointer is, and draws again only when a layer moved.
 */
export class Parallax extends Component {


    constructor(
        /** The layers, the farthest first. */
        public readonly layers: readonly ParallaxLayer[],
    ){
        super()
        this.#shifts = layers.map(() => ({ x: 0, y: 0 }))
        this.#crops = layers.map(() => null)
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
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
        for(let index = 0; index < this.layers.length; index++){
            const crop = this.#cropOf(index, width, height)
            painter.push()
            painter.scale(width / crop.width, height / crop.height)
            painter.sprite(crop, 0, 0)
            painter.pop()
        }
    }


    /** How far each layer is moved on the screen now, in virtual pixels: against the pointer. */
    readonly #shifts: { x: number, y: number }[]

    /** The part of each sprite drawn last, kept while it stays the same, so drawing allocates nothing. */
    readonly #crops: (Sprite|null)[]

    readonly #area = new Rect()

    /** Move each layer where the pointer puts it, and say whether one moved. */
    #follow(): boolean {
        const host = internals.shownHostOf(this)
        const area = this.#area
        if(!host || !internals.absoluteArea(this, area) || area.isEmpty) return false
        // Where the pointer is, from -1 on the left or top edge to 1 on the other.
        const along = (pointer: number, start: number, length: number) => {
            return Math.max(-1, Math.min(1, (pointer - start - length / 2) / (length / 2)))
        }
        const towardX = along(host.pointerX, area.x, area.width)
        const towardY = along(host.pointerY, area.y, area.height)
        let moved = false
        this.layers.forEach((layer, index) => {
            const shift = this.#shifts[index]
            const x = -Math.round(towardX * layer.depth)
            const y = -Math.round(towardY * layer.depth)
            moved ||= x !== shift.x || y !== shift.y
            shift.x = x
            shift.y = y
        })
        return moved
    }

    /** The part of the sprite of a layer over the bounds, at the scale it is drawn at, moved by its shift. */
    #cropOf(index: number, width: number, height: number): Sprite {
        const { sprite, depth } = this.layers[index]
        const shift = this.#shifts[index]
        // The smallest whole scale at which the sprite covers the bounds and the room its depth takes.
        const scaleX = Math.ceil((width + 2 * depth) / sprite.width)
        const scale = Math.max(1, scaleX, Math.ceil((height + 2 * depth) / sprite.height))
        const cropWidth = Math.min(sprite.width, Math.ceil(width / scale))
        const cropHeight = Math.min(sprite.height, Math.ceil(height / scale))
        const roomX = sprite.width - cropWidth
        const roomY = sprite.height - cropHeight
        // The crop goes the other way from the layer, so the picture moves by its shift on the screen.
        const left = clamp(Math.round(roomX / 2 - shift.x / scale), roomX)
        const top = clamp(Math.round(roomY / 2 - shift.y / scale), roomY)
        const kept = this.#crops[index]
        const same = kept && kept.x === sprite.x + left && kept.y === sprite.y + top
            && kept.width === cropWidth && kept.height === cropHeight
        if(kept && same) return kept
        const crop = new Sprite(sprite.texture, sprite.x + left, sprite.y + top, cropWidth, cropHeight)
        this.#crops[index] = crop
        return crop
    }
}

/** A value kept from 0 to a highest. */
function clamp(value: number, high: number): number {
    return Math.max(0, Math.min(high, value))
}
