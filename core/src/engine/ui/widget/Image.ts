import type { Painter, Sprite } from "../../gpu"
import { Color } from "../../math"

import { Component } from "../Component"
import { offsetOf } from "../layout/Box"
import type { Align } from "../layout/Box"
import { EMPTY_HINT, sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"

/** How an image is set up beyond its sprite. */
export interface ImageOptions {
    /** The whole factor it is drawn at, 1 by default. */
    readonly scale?: number

    /** Where it lies across the room it is given, `"center"` by default. */
    readonly alignX?: Exclude<Align, "stretch">

    /** Where it lies down the room it is given, `"center"` by default. */
    readonly alignY?: Exclude<Align, "stretch">

    /** The color it is multiplied by, white by default. */
    readonly tint?: Color
}

/**
 * A sprite, at a whole scale, aligned in the room it is given. It never stretches by a fraction: a sprite
 * between two pixels blurs.
 */
export class Image extends Component {


    constructor(sprite: Sprite|null, options: ImageOptions = {}){
        super()
        this.#sprite = sprite
        this.#scale = Image.#checkedScale(options.scale ?? 1)
        this.#alignX = options.alignX ?? "center"
        this.#alignY = options.alignY ?? "center"
        this.#tint = (options.tint ?? new Color()).clone()
    }


    /** The sprite drawn, none for an empty image. Setting the same one does nothing. */
    public get sprite(): Sprite|null { return this.#sprite }

    public set sprite(sprite: Sprite|null){
        if(sprite === this.#sprite) return
        const sameSize = sprite?.width === this.#sprite?.width && sprite?.height === this.#sprite?.height
        this.#sprite = sprite
        if(sameSize) this.invalidate()
        else this.invalidateLayout()
    }

    /**
     * The whole factor it is drawn at.
     *
     * @throws {@link Error} When it is not a positive whole number.
     */
    public get scale(): number { return this.#scale }

    public set scale(scale: number){
        if(scale === this.#scale) return
        this.#scale = Image.#checkedScale(scale)
        this.invalidateLayout()
    }

    /** The color it is multiplied by, a copy kept by the image. Setting the same one does nothing. */
    public get tint(): Readonly<Color> { return this.#tint }

    public set tint(tint: Readonly<Color>){
        if(this.#tint.equals(tint)) return
        this.#tint.copyFrom(tint)
        this.invalidate()
    }


    protected computeHint(): SizeHint {
        const sprite = this.#sprite
        if(!sprite) return EMPTY_HINT
        return sizeHint(sprite.width * this.#scale, sprite.height * this.#scale)
    }

    protected paint(painter: Painter): void {
        const sprite = this.#sprite
        if(!sprite) return
        const scale = this.#scale
        const x = offsetOf(this.#alignX, this.bounds.width - sprite.width * scale)
        const y = offsetOf(this.#alignY, this.bounds.height - sprite.height * scale)
        painter.setTint(this.#tint)
        painter.translate(x, y)
        painter.scale(scale)
        painter.sprite(sprite, sprite.originX, sprite.originY)
    }


    static #checkedScale(scale: number): number {
        if(!Number.isInteger(scale) || scale <= 0) throw new Error(`An image scales by a positive whole factor, not ${scale}.`)
        return scale
    }


    #sprite: Sprite|null
    #scale: number
    readonly #alignX: Exclude<Align, "stretch">
    readonly #alignY: Exclude<Align, "stretch">
    readonly #tint: Color
}
