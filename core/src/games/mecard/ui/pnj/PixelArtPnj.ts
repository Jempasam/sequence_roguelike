import { AssetError } from "../../../../engine/assets"
import type { Assets } from "../../../../engine/assets"
import { Primitive, RAW_VERTEX_SIZE, Texture } from "../../../../engine/gpu"
import type { Gpu, Painter } from "../../../../engine/gpu"
import type { PixelData } from "../../../../engine/image"
import { Color } from "../../../../engine/math"
import type { Visual } from "../../sim/base/Visual"

import { pathOf } from "../look/visualPath"
import { cutParts, pixelArtLayoutOf } from "./PixelArtLayout"
import type { PixelArtLayout, PixelRect } from "./PixelArtLayout"
import type { PartPlace } from "./PnjPose"

/** How far the body leans at a lean of 1, in radians. */
const QUARTER_TURN = Math.PI / 2

/** How much lower the body stands at a squash of 1, in its height, and how much wider, in its width. */
const MAX_SQUASH = 0.5
const SQUASH_WIDEN = 0.35

/** The narrowest the character gets when seen from the side, in its width: it flips side at it. */
const MIN_WIDTH = 0.35

/**
 * How far sideways from the eyes a point looked at makes the character face it whole, in the width of its
 * body. Closer, it is seen more from the side, so crossing in front of it turns it smoothly.
 */
const TURN_RANGE = 1.5

/** How far the body turns beyond what a point looked at asks, so it is never left narrower than that. */
const TURN_FREE = 0.5

/** How much of the direction of a point looked at, up or down, the body leans, having no head. */
const GAZE_LEAN = 0.5

/** Below this lean, in radians, the body is straight: its curve would have an infinite radius. */
const STRAIGHT = 1e-6

/** How finely the curved part is cut, in cells for each pixel of its height, at least {@link MIN_CELLS}. */
const CELLS_PER_PIXEL = 4
const MIN_CELLS = 8

/** What a character looking at a point does: the side its body faces and how it leans. */
export interface PixelArtGaze {
    readonly orientation: number
    readonly lean: number
}

/** The textures of the three parts of a character, from its top to its bottom. */
export interface PixelArtTextures {
    readonly top: Texture
    readonly middle: Texture
    readonly bottom: Texture
}

/**
 * A character drawn from a sprite alone, cut in three by two lines at the thirds of its height, and bent as
 * a whole: the body of {@link PnjPose}, without a head to turn.
 *
 * @remarks
 * Its coordinates are the pixels of the sprite, `y` down, its origin between its feet: the middle of the
 * bottom edge of the box around the sprite. The sprite faces the viewer, its gaze to the right.
 *
 * The body is straight under the top of its bottom, curves as an arc over its middle, and goes on straight
 * from there at the full lean: its bottom and its top are never stretched, only its middle, so the pixels of
 * a sprite stay what they are as long as they can. A point of the body is bent first, then squashed, then
 * turned: the orientation scales it on `x` around its middle, down to a narrowest width, flipping it when
 * negative.
 *
 * Every setter takes a value in its range and throws outside it, so a pose built by adding effects keeps
 * them in range itself and nothing is cut silently.
 */
export class PixelArtPnj {


    constructor(
        /** Where its parts lie on its sprite. */
        public readonly layout: PixelArtLayout,

        /** The pixels of its parts. */
        public readonly textures: PixelArtTextures,
    ){
        this.#top = new PartMesh(layout.top, textures.top, { across: 1, down: 1 })
        const rows = Math.max(MIN_CELLS, layout.middle.height * CELLS_PER_PIXEL)
        this.#middle = new PartMesh(layout.middle, textures.middle, { across: 1, down: rows })
        this.#bottom = new PartMesh(layout.bottom, textures.bottom, { across: 1, down: 1 })
        this.#hat = this.#placeHat()
        this.#mask = this.#placeMask()
        this.#item = this.#placeItem()
    }

    /**
     * Make a character from the pixels of a sprite.
     *
     * @throws {@link Error} When the sprite cannot be cut, as {@link pixelArtLayoutOf} says.
     */
    public static fromPixels(gpu: Gpu, pixels: PixelData): PixelArtPnj {
        const layout = pixelArtLayoutOf(pixels)
        const { top, middle, bottom } = cutParts(pixels, layout)
        return new PixelArtPnj(layout, {
            top: Texture.fromPixels(gpu, top),
            middle: Texture.fromPixels(gpu, middle),
            bottom: Texture.fromPixels(gpu, bottom),
        })
    }

    /**
     * Load a character from the sprite of a visual.
     *
     * @throws {@link AssetError} When the file cannot be loaded, or cannot be cut.
     */
    public static async load(gpu: Gpu, assets: Assets, visual: Visual): Promise<PixelArtPnj> {
        const path = pathOf(visual)
        const pixels = await assets.image(path)
        // Checked first, so only a sprite that cannot be cut is told as a file to fix.
        try {
            pixelArtLayoutOf(pixels)
        } catch(error){
            throw new AssetError(path, "invalid", error)
        }
        return PixelArtPnj.fromPixels(gpu, pixels)
    }


    //// Pose ////

    /**
     * The side it faces and how much it is seen from the side, from -1, facing left, to 1, facing right as
     * drawn. Toward 0 it is seen more from the side, narrower down to {@link MIN_WIDTH} of its width, and it
     * flips side when the orientation crosses 0.
     */
    public get orientation(): number { return this.#orientation }

    public set orientation(orientation: number){
        this.#orientation = inRange(orientation, -1, 1, "orientation")
        this.#moved()
    }

    /**
     * How its body leans, from -1, forward at a quarter turn, through 0, straight, to 1, backward at a
     * quarter turn. The body curves over its middle, as a sheet of paper bent.
     */
    public get lean(): number { return this.#lean }

    public set lean(lean: number){
        this.#lean = inRange(lean, -1, 1, "lean")
        this.#moved()
    }

    /** How squashed its body is, from 0, not at all, to 1, at its lowest and widest. */
    public get squash(): number { return this.#squash }

    public set squash(squash: number){
        this.#squash = inRange(squash, 0, 1, "squash")
        this.#moved()
    }

    /**
     * The color of its clothes, none to keep those drawn. The middle and the bottom take its hue, keeping the
     * light and shade of the sprite; the top keeps its colors.
     */
    public get clothes(): Color|null { return this.#clothes }

    public set clothes(clothes: Color|null){
        this.#clothes = clothes?.clone() ?? null
    }


    //// Gaze ////

    /**
     * What it does to look at a point. Sideways, the body faces the side of the point, beyond what the point
     * asks by {@link TURN_FREE} so it is never left narrow; up and down, it leans, backward to look up.
     *
     * @param x - The point, in the coordinates of the character.
     */
    public gazeAt(x: number, y: number): PixelArtGaze {
        const { top, zone, width, height } = this.layout
        const toX = x - (zone.x + zone.width / 2 - width / 2)
        const toY = y - (top.height / 2 - height)
        const facing = Math.max(-1, Math.min(1, toX / (zone.width * TURN_RANGE)))
        const orientation = sideOf(facing) * Math.min(1, Math.abs(facing) + TURN_FREE)
        const direction = Math.atan2(-toY, Math.abs(toX)) / QUARTER_TURN
        return { orientation, lean: Math.max(-1, Math.min(1, direction * GAZE_LEAN)) }
    }

    /** Look at a point at once, in the coordinates of the character. */
    public lookAt(x: number, y: number): void {
        this.setGaze(this.gazeAt(x, y))
    }

    /** Take a gaze at once: its orientation and its lean. */
    public setGaze(gaze: PixelArtGaze): void {
        this.#orientation = inRange(gaze.orientation, -1, 1, "orientation")
        this.#lean = inRange(gaze.lean, -1, 1, "lean")
        this.#moved()
    }


    //// Accessories ////

    /** Where a hat sits now: the middle of the bottom of its place, on the head, leaning with the top. */
    public get hat(): Readonly<PartPlace> { return this.#hat }

    /** Where a mask sits now: the middle of its place on the face, leaning with the top. */
    public get mask(): Readonly<PartPlace> { return this.#mask }

    /** Where a carried object sits now: the middle of its place, moving with the body. */
    public get item(): Readonly<PartPlace> { return this.#item }


    //// Shape ////

    /**
     * Write where the middle of its top lands, in the coordinates of the character: where a bubble of
     * speech points.
     */
    public headPointInto(out: { x: number, y: number }): void {
        const { top } = this.layout
        this.bodyPointInto(top.x + top.width / 2, top.y + top.height / 2, out)
    }

    /**
     * Write where a point of the body lands, bent, squashed and turned.
     *
     * @param x - The point, in pixels of the canvas of the sprite.
     * @param out - Where the point is written, in the coordinates of the character.
     */
    public bodyPointInto(x: number, y: number, out: { x: number, y: number }): void {
        const { width, height, bendLine, band } = this.layout
        const across = x - width / 2
        const above = bendLine - y
        let pointX = across
        let pointY = y - height
        if(above > 0){
            const tilt = this.#tilt
            const curved = Math.min(above, band)
            const angle = tilt * curved / band
            // The spine curves as an arc of a circle over the band, then goes on straight at the full tilt.
            const isStraight = Math.abs(tilt) < STRAIGHT
            const radius = isStraight ? 0 : band / tilt
            let ahead = isStraight ? 0 : radius * (1 - Math.cos(angle))
            let up = isStraight ? curved : radius * Math.sin(angle)
            ahead += (above - curved) * Math.sin(angle)
            up += (above - curved) * Math.cos(angle)
            pointX = ahead + across * Math.cos(angle)
            pointY = bendLine - up + across * Math.sin(angle) - height
        }
        const squash = this.#squash
        out.x = pointX * (1 + squash * SQUASH_WIDEN) * widthOf(this.#orientation)
        out.y = pointY * (1 - squash * MAX_SQUASH)
    }

    /**
     * Draw it in its pose, its origin between its feet, with the blend and the tint of the painter.
     *
     * @param betweenBodyAndTop - Called once the middle and the bottom are drawn and before the top, to draw
     * under it what is carried.
     */
    public draw(painter: Painter, betweenBodyAndTop?: () => void): void {
        const clothes = this.#clothes
        painter.push()
        if(clothes) painter.setColorMode("hue")
        this.#bottom.draw(painter, this.#point, clothes ?? WHITE)
        this.#middle.draw(painter, this.#point, clothes ?? WHITE)
        painter.pop()
        betweenBodyAndTop?.()
        this.#top.draw(painter, this.#point, WHITE)
    }

    /** Free its textures. */
    public dispose(): void {
        this.textures.top.dispose()
        this.textures.middle.dispose()
        this.textures.bottom.dispose()
    }


    #orientation = 1
    #lean = 0
    #squash = 0
    #clothes: Color|null = null
    readonly #top: PartMesh
    readonly #middle: PartMesh
    readonly #bottom: PartMesh
    #hat: Readonly<PartPlace>
    #mask: Readonly<PartPlace>
    #item: Readonly<PartPlace>

    /** A point to compute in, so placing something allocates nothing but its place. */
    readonly #point: PointMove = (x, y, out) => this.bodyPointInto(x, y, out)
    readonly #spot = { x: 0, y: 0 }
    readonly #itemEnd = { x: 0, y: 0 }

    /** How far the top of the body is turned, in radians, clockwise: forward is toward the gaze. */
    get #tilt(): number {
        return -this.#lean * QUARTER_TURN
    }

    /** How far the body is turned at a height of the canvas, in radians: none under its bend, all over it. */
    #angleAt(y: number): number {
        const { bendLine, band } = this.layout
        return this.#tilt * Math.max(0, Math.min(bendLine - y, band)) / band
    }

    /** Place what is worn or carried again after a change of pose. */
    #moved(): void {
        this.#hat = this.#placeHat()
        this.#mask = this.#placeMask()
        this.#item = this.#placeItem()
    }

    /** The place of something on the body: its point, turned as the body is there, scaled as it is turned. */
    #placeOn(rect: PixelRect, atX: number, atY: number): Readonly<PartPlace> {
        const point = this.#spot
        this.bodyPointInto(atX, atY, point)
        return {
            x: point.x, y: point.y, angle: this.#angleAt(atY), scaleX: widthOf(this.#orientation),
            width: rect.width, height: rect.height,
        }
    }

    /** The middle of the bottom of the place of the hat. */
    #placeHat(): Readonly<PartPlace> {
        const rect = this.layout.hatPlace
        return this.#placeOn(rect, rect.x + rect.width / 2, rect.y + rect.height)
    }

    /** The middle of the place of the mask. */
    #placeMask(): Readonly<PartPlace> {
        const rect = this.layout.maskPlace
        return this.#placeOn(rect, rect.x + rect.width / 2, rect.y + rect.height / 2)
    }

    /**
     * The place of the object: the line made for it, along the length of its place, through its middle, with
     * both ends moved by the body. The object lies along that line, its tip toward the second end, the held
     * part on its middle, so its width is the length of the line as the pose shows it.
     */
    #placeItem(): Readonly<PartPlace> {
        const { x, y, width, height } = this.layout.itemPlace
        const middle = y + height / 2
        const first = this.#spot
        const last = this.#itemEnd
        this.bodyPointInto(x, middle, first)
        this.bodyPointInto(x + width, middle, last)
        // The object is drawn from its first end to its second one. When the body is flipped, the line points
        // left: the object is mirrored, so it is never upside down and its tip is toward where it faces.
        const dx = last.x - first.x
        const dy = last.y - first.y
        const isFlipped = dx < 0
        return {
            x: (first.x + last.x) / 2, y: (first.y + last.y) / 2,
            angle: Math.atan2(dy, isFlipped ? -dx : dx), scaleX: isFlipped ? -1 : 1,
            width: Math.hypot(dx, dy), height,
        }
    }
}

/** The color that leaves a texture as it is. */
const WHITE = new Color()

/** Where a point of the canvas lands, written in `out`. */
type PointMove = (x: number, y: number, out: { x: number, y: number }) => void

/** The grid a part is drawn with, its points moved where the pose puts them at each drawing. */
class PartMesh {


    constructor(
        public readonly rect: PixelRect,
        public readonly texture: Texture,
        public readonly cells: { readonly across: number, readonly down: number },
    ){
        const columns = cells.across + 1
        const rows = cells.down + 1
        this.#vertices = new Float32Array(columns * rows * RAW_VERTEX_SIZE)
        this.#indices = new Uint16Array(cells.across * cells.down * 6)
        let at = 0
        for(let row = 0; row < cells.down; row++){
            for(let column = 0; column < cells.across; column++){
                const corner = row * columns + column
                const below = corner + columns
                this.#indices.set([corner, corner + 1, below + 1, corner, below + 1, below], at)
                at += 6
            }
        }
    }


    /** Draw the part, each point of its grid moved by `pointInto`, its colors those of the vertices. */
    public draw(painter: Painter, pointInto: PointMove, color: Color): void {
        const { rect, cells } = this
        const vertices = this.#vertices
        const point = this.#point
        let v = 0
        for(let row = 0; row <= cells.down; row++){
            const y = rect.y + rect.height * row / cells.down
            for(let column = 0; column <= cells.across; column++){
                const x = rect.x + rect.width * column / cells.across
                pointInto(x, y, point)
                vertices[v] = point.x
                vertices[v + 1] = point.y
                vertices[v + 2] = 0
                // A texel of the texture is a pixel of the sprite.
                vertices[v + 3] = x - rect.x
                vertices[v + 4] = y - rect.y
                vertices[v + 5] = color.r
                vertices[v + 6] = color.g
                vertices[v + 7] = color.b
                vertices[v + 8] = color.a
                v += RAW_VERTEX_SIZE
            }
        }
        painter.draw(vertices, this.#indices, this.texture, Primitive.TRIANGLES)
    }


    readonly #vertices: Float32Array
    readonly #indices: Uint16Array
    readonly #point = { x: 0, y: 0 }
}

/** The side an orientation faces: -1 for the left, 1 for the right, which 0 faces as drawn. */
function sideOf(orientation: number): -1|1 {
    return orientation < 0 ? -1 : 1
}

/** How an orientation scales on `x`: never narrower than {@link MIN_WIDTH}, flipped on the left. */
function widthOf(orientation: number): number {
    return sideOf(orientation) * (MIN_WIDTH + (1 - MIN_WIDTH) * Math.abs(orientation))
}

/**
 * A value of a pose, checked to be in its range.
 *
 * @throws {@link RangeError} When it is outside, or not a number.
 */
function inRange(value: number, low: number, high: number, name: string): number {
    if(!(value >= low && value <= high)){
        throw new RangeError(`The ${name} of a character goes from ${low} to ${high}, not ${value}.`)
    }
    return value
}
