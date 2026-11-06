import type { Painter, Sprite } from "../../../../engine/gpu"
import type { Color } from "../../../../engine/math"
import { Component, EMPTY_HINT } from "../../../../engine/ui"
import type { SizeHint, UiEvent } from "../../../../engine/ui"

import type { PnjActor } from "./PnjActor"
import type { PartPlace } from "./PnjPose"

/** How much of the height of the view the character takes when standing straight. */
const HEIGHT_SHARE = 0.8

/** The space under its feet, in its height. */
const FEET_MARGIN = 0.05

/** How much wider a hat of size 1 is than its place on the head, which it barely covers. */
const HAT_COVER = 1.15

/**
 * How many pixels of the painting a pixel of the picture of a mask or an object takes at size 1: about that
 * of the hats, whose pictures cover the place of the hat at 128 pixels over 69, times their size.
 */
const ACCESSORY_PIXEL = 2.5

/** The middle of a picture. */
const CENTER: readonly [x: number, y: number] = [0.5, 0.5]

/** The middle of the bottom edge of a picture, where a hat stands. */
const BOTTOM: readonly [x: number, y: number] = [0.5, 1]

/** Something worn or carried, and how large. */
export interface PnjAccessory {
    readonly sprite: Sprite

    /**
     * How large it is. A hat at 1 barely covers its place, more for one larger than it, such as the wide
     * brim of a witch hat. A mask or an object keeps pixels of {@link ACCESSORY_PIXEL} at 1, as the hats
     * have about, so its picture is drawn to the scale of the place it is made for.
     */
    readonly size: number

    /**
     * The point of the picture set on its place, as shares of its width and height: the middle of the bottom
     * edge for a hat, the held part for an object, the middle by default.
     */
    readonly anchor?: readonly [x: number, y: number]
}

/** A hat, and how large it is worn. */
export type PnjHat = PnjAccessory

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
 * its head, a mask on its face and an object in its hands. While it follows the pointer, it looks at it over the whole view, or over the whole interface
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

    /** The mask on its face, none unmasked. It turns with the head, over the face and under the hat. */
    public get mask(): PnjAccessory|null { return this.#mask }

    public set mask(mask: PnjAccessory|null){
        if(mask === this.#mask) return
        this.#mask = mask
        this.invalidate()
    }

    /** The color of the mask, none to keep the one painted, as {@link hatColor}. */
    public get maskColor(): Color|null { return this.#maskColor }

    public set maskColor(color: Color|null){
        this.#maskColor = color?.clone() ?? null
        this.invalidate()
    }

    /**
     * The object it carries, none empty-handed. It lies along the line painted for it, as long as the line
     * at size 1, drawn lengthwise (its width is its length), moving with the body, under its hands.
     */
    public get item(): PnjAccessory|null { return this.#item }

    public set item(item: PnjAccessory|null){
        if(item === this.#item) return
        this.#item = item
        this.invalidate()
    }

    /** The color of the object, none to keep the one painted, as {@link hatColor}. */
    public get itemColor(): Color|null { return this.#itemColor }

    public set itemColor(color: Color|null){
        this.#itemColor = color?.clone() ?? null
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
        const { layout } = pnj
        const { hat, mask, item } = this
        pnj.draw(painter, () => {
            if(!item) return
            // The object keeps its pixels, shrunk as the line painted for it is when the body turns.
            const shown = pnj.item.width / layout.itemPlace.width
            this.#drawAccessory(painter, item, pnj.item, this.#itemColor, ACCESSORY_PIXEL * item.size * shown)
        })
        if(mask) this.#drawAccessory(painter, mask, pnj.mask, this.#maskColor, ACCESSORY_PIXEL * mask.size)
        if(hat){
            const hatScale = pnj.hat.width * HAT_COVER * hat.size / hat.sprite.width
            this.#drawAccessory(painter, hat, pnj.hat, this.#hatColor, hatScale, BOTTOM)
        }
        painter.pop()
    }

    /**
     * Draw something worn or carried where the pose places it, recolored when given a color, its anchor on
     * its place.
     *
     * @param scale - How many pixels of the painting a pixel of its picture takes.
     * @param anchor - The anchor when the accessory gives none.
     */
    #drawAccessory(
        painter: Painter, accessory: PnjAccessory, place: Readonly<PartPlace>, color: Color|null, scale: number,
        anchor: readonly [x: number, y: number] = CENTER,
    ): void {
        const { sprite } = accessory
        const [anchorX, anchorY] = accessory.anchor ?? anchor
        painter.push()
        if(color){
            painter.setColorMode("hue")
            painter.setTint(color)
        }
        painter.translate(place.x, place.y)
        painter.scale(place.scaleX, 1)
        painter.rotate(place.angle)
        painter.scale(scale)
        painter.sprite(sprite, -sprite.width * anchorX, -sprite.height * anchorY)
        painter.pop()
    }


    readonly #centerShare: number
    readonly #pointer: PnjPointer|null
    readonly #depth: number
    readonly #interactive: boolean
    #hat: PnjHat|null = null
    #hatColor: Color|null = null
    #mask: PnjAccessory|null = null
    #maskColor: Color|null = null
    #item: PnjAccessory|null = null
    #itemColor: Color|null = null

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
