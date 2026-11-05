import type { Painter, Sprite } from "../../../../engine/gpu"
import type { Color } from "../../../../engine/math"
import { Component, EMPTY_HINT } from "../../../../engine/ui"
import type { SizeHint, UiEvent } from "../../../../engine/ui"

import type { PnjActor } from "./PnjActor"

/** How much of the height of the view the character takes when standing straight. */
const HEIGHT_SHARE = 0.8

/** The space under its feet, in its height. */
const FEET_MARGIN = 0.05

/** How much wider a hat of size 1 is than its place on the head, which it barely covers. */
const HAT_COVER = 1.15

/** A hat, and how large it is worn. */
export interface PnjHat {
    readonly sprite: Sprite

    /**
     * How large it is, 1 barely covering its place on the head, more for a hat larger than the head, such as
     * the wide brim of a witch hat. It grows from the middle of its bottom edge.
     */
    readonly size: number
}

/** Where the pointer is, in virtual pixels of the interface: the interface itself. */
export interface PnjPointer {
    readonly pointerX: number
    readonly pointerY: number
}

/** Where a view stands its character, and what it follows. */
export interface PnjViewOptions {
    /** Where its feet stand along the width, from 0 on the left to 1 on the right: the middle by default. */
    readonly centerShare?: number

    /**
     * Where the pointer is read from at each frame, to look at it wherever it is, none to look at it only
     * while it is over the view. Read, the view is stretched over the whole interface.
     */
    readonly pointer?: PnjPointer|null

    /**
     * How far it moves against the pointer going from the middle to an edge, in virtual pixels, as a layer of
     * a parallax: none by default. It needs a pointer to read.
     */
    readonly depth?: number

    /** Is it hit by the pointer? It is by default, to follow it; one behind panels is not. */
    readonly interactive?: boolean
}

/**
 * A character standing in its bounds, scaled to them, brought to life by its actor at each frame, a hat on
 * its head. While it follows the pointer, it looks at it over the whole view, or over the whole interface
 * when it is given where to read it.
 *
 * @remarks
 * It takes the size it is given and asks none, as a stage does. The hat is drawn where the pose places it,
 * so it shows how a game reads {@link PnjPose.hat}.
 */
export class PnjView extends Component {


    /** Does it make the character look at the pointer? */
    public followsPointer = true

    /** Does its actor move the character at each frame? Paused, the pose is the one last set. */
    public animated = true

    constructor(
        /** The character it shows, and what moves it. */
        public readonly actor: PnjActor,

        options: PnjViewOptions = {},
    ){
        super()
        this.#centerShare = options.centerShare ?? 0.5
        this.#pointer = options.pointer ?? null
        this.#depth = options.depth ?? 0
        this.#interactive = options.interactive ?? true
    }


    /** The hat on its head, none bare-headed. */
    public get hat(): PnjHat|null { return this.#hat }

    public set hat(hat: PnjHat|null){
        if(hat === this.#hat) return
        this.#hat = hat
        this.invalidate()
    }

    /**
     * The color of the hat, none to keep the one painted. The hat takes its hue, keeping the light and shade
     * of its picture, as the clothes take theirs: white and grey stay as they are.
     */
    public get hatColor(): Color|null { return this.#hatColor }

    public set hatColor(color: Color|null){
        this.#hatColor = color?.clone() ?? null
        this.invalidate()
    }


    /**
     * Write where the middle of the head of the character is drawn, in the coordinates of the view, as it
     * stands now. False, and nothing written, while the view has no size.
     */
    public headInto(out: { x: number, y: number }): boolean {
        const scale = this.#scale
        if(scale === 0) return false
        const pnj = this.actor.pnj
        const head = pnj.layout.head
        pnj.headPointInto(head.x + head.width / 2, head.y + head.height / 2, out)
        const [feetX, feetY] = this.#feet
        out.x = feetX + this.#shiftX + out.x * scale
        out.y = feetY + this.#shiftY + out.y * scale
        return true
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    protected override get interactive(): boolean {
        return this.#interactive
    }

    protected override arranged(): void {
        this.ticking = true
    }

    protected override tick(dt: number): void {
        const pointer = this.#pointer
        if(pointer){
            this.#follow(pointer)
            if(this.followsPointer) this.#look(pointer.pointerX, pointer.pointerY)
        }
        if(this.animated) this.actor.update(dt)
        this.invalidate()
    }

    protected override handle(event: UiEvent): void {
        if(event.type !== "pointer-move" || !this.followsPointer || this.#pointer) return
        this.#look(event.x, event.y)
    }

    protected paint(painter: Painter): void {
        const scale = this.#scale
        if(scale === 0) return
        const [feetX, feetY] = this.#feet
        const pnj = this.actor.pnj
        painter.push()
        painter.setBlend("alpha")
        painter.translate(feetX + this.#shiftX, feetY + this.#shiftY)
        painter.scale(scale)
        pnj.draw(painter)
        const hat = this.#hat
        if(hat){
            const { sprite } = hat
            const place = pnj.hat
            const color = this.#hatColor
            if(color){
                painter.setColorMode("hue")
                painter.setTint(color)
            }
            painter.translate(place.x, place.y)
            painter.scale(place.scaleX, 1)
            painter.rotate(place.angle)
            painter.scale(place.width * HAT_COVER * hat.size / sprite.width)
            painter.sprite(sprite, -sprite.width / 2, -sprite.height)
        }
        painter.pop()
    }


    readonly #centerShare: number
    readonly #pointer: PnjPointer|null
    readonly #depth: number
    readonly #interactive: boolean
    #hat: PnjHat|null = null
    #hatColor: Color|null = null

    /** How far the character is moved against the pointer now, in virtual pixels. */
    #shiftX = 0
    #shiftY = 0

    /** How many virtual pixels a pixel of the painting takes. */
    get #scale(): number {
        return this.bounds.height * HEIGHT_SHARE / this.actor.pnj.layout.height
    }

    /** Where its feet stand in the view, unmoved by the pointer. */
    get #feet(): [x: number, y: number] {
        const { width, height } = this.bounds
        return [width * this.#centerShare, height * (1 - FEET_MARGIN)]
    }

    /** Look at a point of the view. */
    #look(x: number, y: number): void {
        const scale = this.#scale
        if(scale === 0) return
        const [feetX, feetY] = this.#feet
        this.actor.look((x - feetX - this.#shiftX) / scale, (y - feetY - this.#shiftY) / scale)
    }

    /** Move against the pointer by its depth, as a parallax moves its layers. */
    #follow(pointer: PnjPointer): void {
        const { width, height } = this.bounds
        if(width === 0 || height === 0) return
        // Where the pointer is, from -1 on the left or top edge to 1 on the other.
        const along = (at: number, length: number) => {
            return Math.max(-1, Math.min(1, (at - length / 2) / (length / 2)))
        }
        this.#shiftX = -Math.round(along(pointer.pointerX, width) * this.#depth)
        this.#shiftY = -Math.round(along(pointer.pointerY, height) * this.#depth)
    }
}
