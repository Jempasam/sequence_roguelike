import { Primitive, RAW_VERTEX_SIZE, Texture } from "../../gpu"
import type { Gpu, Painter } from "../../gpu"
import { shrinkPixels } from "../../image"
import type { OraImage } from "../../image"

import { Component } from "../Component"
import { EMPTY_HINT } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import { readTransition } from "./TransitionScript"
import type { TransitionPicture, TransitionScript } from "./TransitionScript"

/** How a transition is played. */
export interface TransitionPlay {
    /** How long it takes from one end to the other, in seconds. */
    readonly duration: number

    /** Is it played from its end back to its start? */
    readonly reverse?: boolean

    /** Hear that it passed its middle, where it covers what changes behind it. */
    readonly onMiddle?: () => void

    /** Hear that it reached its end, as it hides. */
    readonly onEnd?: () => void
}

/** The quad of a picture, as `Painter.draw` takes it. */
const QUAD_INDICES = [0, 1, 2, 0, 2, 3]

/**
 * A transition between two screens: pictures laid over one another in a space of its own, each moved and
 * scaled through the same frames at once, read from a painting (see {@link readTransition}). It takes the
 * size it is given and asks none: the content of a layer of its own, stretched over the screen.
 *
 * @remarks
 * The space covers the bounds, centered, its overflow cut: it keeps its aspect. Between two frames, a
 * picture eases in and out. The transition is shown and holds the input only while it plays, the pointer
 * consumed over it, and ticks only then. Nothing is drawn outside the bounds: a picture is cut to them, to
 * the texel.
 */
export class Transition extends Component {


    /**
     * @param textures - The pixels of each picture, in the order of the script, made `shrink` times
     * smaller than its layer.
     * @param shrink - How many pixels of the painting a texel of the textures holds, on each side.
     */
    constructor(
        public readonly script: TransitionScript,
        public readonly textures: readonly Texture[],
        public readonly shrink = 1,
    ){
        super()
        if(textures.length !== script.pictures.length){
            throw new Error(`A transition of ${script.pictures.length} pictures got ${textures.length} textures.`)
        }
        this.visible = false
    }

    /**
     * Make a transition painted in an image of layers named by their frames.
     *
     * @param name - The name of the image, only used in error messages.
     * @param shrink - How many times smaller its textures are than the painting, a whole number from 1.
     * @throws {@link Error} When a layer name does not give its frames as {@link readTransition} reads them.
     */
    public static fromImage(gpu: Gpu, image: OraImage, name: string, shrink = 1): Transition {
        const script = readTransition(image, name)
        const textures = script.pictures.map(picture => {
            return Texture.fromPixels(gpu, shrinkPixels(picture.layer.pixels, shrink))
        })
        return new Transition(script, textures, shrink)
    }


    /** Is it playing? */
    public get playing(): boolean { return this.#play !== null }

    /** Where it stands, from 0 at its start to 1 at its end. */
    public get progress(): number { return this.#progress }

    /**
     * Play it, shown over what lies below, which takes no input meanwhile. Played while it plays, it goes
     * on from where it stands, with the new duration, way and listeners: the former ones are not called.
     *
     * @throws {@link Error} When the duration is not above 0.
     */
    public play(play: TransitionPlay): void {
        if(!(play.duration > 0)) throw new Error(`A transition plays for more than 0 seconds, not ${play.duration}.`)
        const reverse = play.reverse ?? false
        if(!this.#play) this.#progress = reverse ? 1 : 0
        const middle = this.script.middle
        this.#play = play
        this.#middlePassed = reverse ? this.#progress < middle : this.#progress > middle
        this.visible = true
        this.ticking = true
        this.invalidate()
    }

    /** Stop it where it stands and hide it, calling none of its listeners. */
    public stop(): void {
        if(!this.#play) return
        this.#play = null
        this.ticking = false
        this.visible = false
    }

    /** Free its textures. */
    public dispose(): void {
        for(const texture of this.textures) texture.dispose()
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    /** It takes the pointer while it plays, so nothing below hears a click, the world included. */
    protected override get interactive(): boolean {
        return this.#play !== null
    }

    protected override get modal(): boolean {
        return this.#play !== null
    }

    protected override arranged(): void {
        this.ticking = this.#play !== null
    }

    protected override tick(dt: number): void {
        const play = this.#play
        if(!play) return
        const reverse = play.reverse ?? false
        const step = dt / play.duration
        this.#progress = Math.max(0, Math.min(1, this.#progress + (reverse ? -step : step)))
        this.invalidate()
        const middle = this.script.middle
        if(!this.#middlePassed && (reverse ? this.#progress <= middle : this.#progress >= middle)){
            this.#middlePassed = true
            play.onMiddle?.()
            // A listener playing it again or stopping it takes it over.
            if(this.#play !== play) return
        }
        if(this.#progress !== (reverse ? 0 : 1)) return
        this.stop()
        play.onEnd?.()
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        if(width === 0 || height === 0) return
        const { aspect, pictures } = this.script
        // The space covers the bounds, centered.
        const spaceHeight = Math.max(height, width / aspect)
        const spaceWidth = spaceHeight * aspect
        const left = (width - spaceWidth) / 2
        const top = (height - spaceHeight) / 2
        painter.push()
        painter.setBlend("alpha")
        pictures.forEach((picture, index) => {
            this.#drawPicture(painter, picture, this.textures[index], left, top, spaceWidth, spaceHeight)
        })
        painter.pop()
    }


    /** The way it plays now, none when it is stopped. */
    #play: TransitionPlay|null = null

    #progress = 0

    /** Did it pass its middle since it was last played? */
    #middlePassed = false

    /** The vertices of a picture drawn, kept from one picture to the next. */
    readonly #vertices = new Float32Array(4 * RAW_VERTEX_SIZE)

    /** Draw a picture where it stands now, cut to the bounds. */
    #drawPicture(
        painter: Painter, picture: TransitionPicture, texture: Texture,
        spaceLeft: number, spaceTop: number, spaceWidth: number, spaceHeight: number,
    ): void {
        const { scale, x, y, opacity } = this.#frameAt(picture)
        const alpha = opacity * picture.layer.opacity
        if(scale === 0 || alpha === 0) return
        // A texel holds `shrink` pixels of the painting, and the last ones may stand past its layer.
        const texelWidth = spaceWidth * picture.width * scale * this.shrink / picture.layer.pixels.width
        const texelHeight = spaceHeight * picture.height * scale * this.shrink / picture.layer.pixels.height
        const centerX = spaceLeft + spaceWidth * (picture.x + picture.width / 2 + x)
        const centerY = spaceTop + spaceHeight * (picture.y + picture.height / 2 + y)
        const left = centerX - spaceWidth * picture.width * scale / 2
        const top = centerY - spaceHeight * picture.height * scale / 2
        const { width, height } = this.bounds
        const shownLeft = Math.max(0, left)
        const shownTop = Math.max(0, top)
        const shownRight = Math.min(width, left + texture.width * texelWidth)
        const shownBottom = Math.min(height, top + texture.height * texelHeight)
        if(shownLeft >= shownRight || shownTop >= shownBottom) return
        // The texels shown, whole, since a vertex holds whole texels: a cut one is squeezed into what shows.
        const u0 = Math.max(0, Math.floor((shownLeft - left) / texelWidth))
        const v0 = Math.max(0, Math.floor((shownTop - top) / texelHeight))
        const u1 = Math.min(texture.width, Math.ceil((shownRight - left) / texelWidth))
        const v1 = Math.min(texture.height, Math.ceil((shownBottom - top) / texelHeight))
        const vertices = this.#vertices
        const corner = (index: number, cornerX: number, cornerY: number, u: number, v: number) => {
            const at = index * RAW_VERTEX_SIZE
            vertices[at] = cornerX
            vertices[at + 1] = cornerY
            vertices[at + 2] = 0
            vertices[at + 3] = u
            vertices[at + 4] = v
            vertices[at + 5] = 1
            vertices[at + 6] = 1
            vertices[at + 7] = 1
            vertices[at + 8] = alpha
        }
        corner(0, shownLeft, shownTop, u0, v0)
        corner(1, shownRight, shownTop, u1, v0)
        corner(2, shownRight, shownBottom, u1, v1)
        corner(3, shownLeft, shownBottom, u0, v1)
        painter.draw(vertices, QUAD_INDICES, texture, Primitive.TRIANGLES)
    }

    /** Where a picture stands now, eased in and out between the two frames around the progress. */
    #frameAt(picture: TransitionPicture): { x: number, y: number, scale: number, opacity: number } {
        const { frames } = picture
        const along = this.#progress * (frames.length - 1)
        const index = Math.min(frames.length - 2, Math.floor(along))
        const t = along - index
        const eased = t * t * (3 - 2 * t)
        const from = frames[index]
        const to = frames[index + 1]
        const mix = (a: number, b: number) => a + (b - a) * eased
        return {
            x: mix(from.x, to.x),
            y: mix(from.y, to.y),
            scale: mix(from.scale, to.scale),
            opacity: mix(from.opacity, to.opacity),
        }
    }
}
