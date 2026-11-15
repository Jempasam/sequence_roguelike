import type { Painter } from "../../../../engine/gpu"
import type { Color } from "../../../../engine/math"
import { Component, EMPTY_HINT } from "../../../../engine/ui"
import type { SizeHint, UiEvent } from "../../../../engine/ui"

import type { PixelArtActor } from "./PixelArtActor"
import type { PartPlace } from "./PnjPose"
import type { PnjAccessory, PnjPointer, PnjViewOptions } from "./PnjView"

/** How much of the height of the view the character takes when standing straight. */
const HEIGHT_SHARE = 0.8

/** The space under its feet, in its height. */
const FEET_MARGIN = 0.05

/** How much wider a hat of size 1 is than its place on the head, which it barely covers. */
const HAT_COVER = 1.15

/** The middle of a picture. */
const CENTER: readonly [x: number, y: number] = [0.5, 0.5]

/** The middle of the bottom edge of a picture, where a hat stands. */
const BOTTOM: readonly [x: number, y: number] = [0.5, 1]

/**
 * A character drawn from a sprite standing in its bounds, scaled to them, brought to life by its actor at
 * each frame, a hat on its head, a mask on its face and an object at its side. While it follows the pointer,
 * it looks at it over the whole view, or over the whole interface when it is given where to read it.
 *
 * @remarks
 * It is to a {@link PixelArtPnj} what {@link PnjView} is to a {@link Pnj}, with the same options and the
 * same accessories: it takes the size it is given and asks none, as a stage does.
 */
export class PixelArtView extends Component {


    /** Does it make the character look at the pointer? */
    public followsPointer = true

    /** Does its actor move the character at each frame? Paused, the pose is the one last set. */
    public animated = true

    constructor(
        /** The character it shows, and what moves it. */
        public readonly actor: PixelArtActor,

        options: PnjViewOptions = {},
    ){
        super()
        this.#centerShare = options.centerShare ?? 0.5
        this.#pointer = options.pointer ?? null
        const depth = options.depth ?? 0
        this.#depth = typeof depth === "number" ? { x: depth, y: depth } : depth
        this.#interactive = options.interactive ?? true
    }


    /** The hat on its head, none bare-headed. */
    public get hat(): PnjAccessory|null { return this.#hat }

    public set hat(hat: PnjAccessory|null){
        if(hat === this.#hat) return
        this.#hat = hat
        this.invalidate()
    }

    /** The color of the hat, none to keep the one drawn. It takes the hue, keeping its light and shade. */
    public get hatColor(): Color|null { return this.#hatColor }

    public set hatColor(color: Color|null){
        this.#hatColor = color?.clone() ?? null
        this.invalidate()
    }

    /** The mask on its face, none unmasked. It leans with the top, over the face and under the hat. */
    public get mask(): PnjAccessory|null { return this.#mask }

    public set mask(mask: PnjAccessory|null){
        if(mask === this.#mask) return
        this.#mask = mask
        this.invalidate()
    }

    /** The color of the mask, none to keep the one drawn, as {@link hatColor}. */
    public get maskColor(): Color|null { return this.#maskColor }

    public set maskColor(color: Color|null){
        this.#maskColor = color?.clone() ?? null
        this.invalidate()
    }

    /**
     * The object it carries, none empty-handed. It lies along the line made for it, on the right of its
     * body, drawn lengthwise (its width is its length), moving with the body, under its top.
     */
    public get item(): PnjAccessory|null { return this.#item }

    public set item(item: PnjAccessory|null){
        if(item === this.#item) return
        this.#item = item
        this.invalidate()
    }

    /** The color of the object, none to keep the one drawn, as {@link hatColor}. */
    public get itemColor(): Color|null { return this.#itemColor }

    public set itemColor(color: Color|null){
        this.#itemColor = color?.clone() ?? null
        this.invalidate()
    }


    /**
     * Write where the middle of the top of the character is drawn, in the coordinates of the view, as it
     * stands now. False, and nothing written, while the view has no size.
     */
    public headInto(out: { x: number, y: number }): boolean {
        const scale = this.#scale
        if(scale === 0) return false
        this.actor.pnj.headPointInto(out)
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
        const pixel = layout.accessoryPixel
        pnj.draw(painter, () => {
            if(!item) return
            // The object keeps its pixels, shrunk as the line made for it is when the body turns.
            const shown = pnj.item.width / layout.itemPlace.width
            this.#drawAccessory(painter, item, pnj.item, this.#itemColor, pixel * item.size * shown)
        })
        if(mask) this.#drawAccessory(painter, mask, pnj.mask, this.#maskColor, pixel * mask.size)
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
     * @param scale - How many pixels of the sprite a pixel of its picture takes.
     * @param anchor - The anchor when the accessory gives none.
     */
    #drawAccessory(
        painter: Painter, accessory: PnjAccessory, place: Readonly<PartPlace>, color: Color|null,
        scale: number,
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
    readonly #depth: { readonly x: number, readonly y: number }
    readonly #interactive: boolean
    #hat: PnjAccessory|null = null
    #hatColor: Color|null = null
    #mask: PnjAccessory|null = null
    #maskColor: Color|null = null
    #item: PnjAccessory|null = null
    #itemColor: Color|null = null

    /** How far the character is moved against the pointer now, in virtual pixels. */
    #shiftX = 0
    #shiftY = 0

    /** How many virtual pixels a pixel of the sprite takes. */
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
        this.#shiftX = -Math.round(along(pointer.pointerX, width) * this.#depth.x)
        this.#shiftY = -Math.round(along(pointer.pointerY, height) * this.#depth.y)
    }
}
