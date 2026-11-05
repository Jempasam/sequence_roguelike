import { Primitive, RAW_VERTEX_SIZE } from "../gpu"
import type { Painter, Sprite } from "../gpu"
import { Color } from "../math"

import type { Rect } from "./Rect"
import { TileRun } from "./TileRun"
import type { Tiling } from "./TileRun"

/** The vertices of a nine-slice, a grid of four by four. */
const VERTEX_COUNT = 16

/** The indices of the nine quads of a nine-slice, over the grid of its vertices. */
const INDICES = (() => {
    const indices: number[] = []
    for(let row = 0; row < 3; row++){
        for(let column = 0; column < 3; column++){
            const topLeft = row * 4 + column
            indices.push(topLeft, topLeft + 1, topLeft + 5, topLeft, topLeft + 5, topLeft + 4)
        }
    }
    return indices
})()

/** The vertices of a tile of a nine-slice. */
const TILE_VERTEX_COUNT = 4

/** The indices of a tile of a nine-slice, two triangles over its corners in order. */
const TILE_INDICES = [0, 1, 2, 0, 2, 3] as const

/** The four margins of a nine-slice. */
export interface NineSliceMargins {
    readonly left: number
    readonly top: number
    readonly right: number
    readonly bottom: number
}

/** How a nine-slice is set up beyond its sprite and margins. */
export interface NineSliceOptions {
    /**
     * Is the center of its sprite fully opaque? Declared, not checked: a frame claiming it while its center
     * has holes leaves stale pixels on screen. False by default.
     */
    readonly opaqueCenter?: boolean

    /** The color it is multiplied by, white by default: what colors a flat frame cut from a white pixel. */
    readonly color?: Color

    /**
     * How wide its margins are drawn, in whole pixels, as wide as they are in its sprite by default: a
     * thicker or a thinner frame from the same picture.
     */
    readonly border?: NineSliceMargins

    /**
     * How its edges and its center repeat, none by default: each is stretched in one piece. The tiles of an
     * edge are as thick as the edge and keep the aspect ratio of the sprite, those of the center take the
     * scale of the edges around it.
     */
    readonly tiling?: Tiling|null
}

/**
 * A sprite with four margins, drawn at any size: the corners stay as they are, the edges and the center
 * stretch in nine quads, or repeat as its tiling says. Sampled to the nearest texel, a stretched flat color
 * warps nothing.
 */
export class NineSlice {


    /** Its margins, in texels of its sprite. */
    public readonly left: number
    public readonly top: number
    public readonly right: number
    public readonly bottom: number

    /** Is the center of its sprite fully opaque, as declared? */
    public readonly opaqueCenter: boolean

    /** The color it is multiplied by. */
    public readonly color: Color

    /** How wide its margins are drawn, in pixels. */
    public readonly border: NineSliceMargins

    /** How its edges and its center repeat, none when each is stretched in one piece. */
    public readonly tiling: Tiling|null

    /**
     * @throws {@link Error} When the margins are not whole texels or do not fit in the sprite, when the
     *   border is not whole pixels, or when it repeats a center the margins leave empty.
     */
    constructor(
        /** The image it is cut from, ideally in the atlas of the interface. */
        public readonly sprite: Sprite,

        /** Its margins, in texels of its sprite. */
        margins: NineSliceMargins,

        options: NineSliceOptions = {},
    ){
        const { left, top, right, bottom } = margins
        if(!NineSlice.#isWhole(margins) || left + right > sprite.width || top + bottom > sprite.height){
            throw new Error(`The margins ${left}, ${top}, ${right}, ${bottom} do not fit in a sprite of`
                + ` ${sprite.width}×${sprite.height}.`)
        }
        this.left = left
        this.top = top
        this.right = right
        this.bottom = bottom
        this.opaqueCenter = options.opaqueCenter ?? false
        this.color = options.color ?? new Color(1, 1, 1)
        this.border = options.border ?? margins
        this.tiling = options.tiling ?? null
        if(!NineSlice.#isWhole(this.border)){
            const drawn = this.border
            throw new Error(`A nine-slice has a border of whole pixels, not ${drawn.left}, ${drawn.top},`
                + ` ${drawn.right}, ${drawn.bottom}.`)
        }
        const hasCenter = left + right < sprite.width && top + bottom < sprite.height
        if(this.tiling && !hasCenter){
            throw new Error(`The margins ${left}, ${top}, ${right}, ${bottom} leave nothing to repeat in a`
                + ` sprite of ${sprite.width}×${sprite.height}.`)
        }
    }

    /**
     * A frame of a flat color, cut from a white texel: the frames of a debug theme, which needs no art.
     *
     * @param white - A white region, as `Painter.setWhitePixel` takes, in the atlas of the interface.
     */
    public static flat(white: Sprite, color: Color): NineSlice {
        // A one texel inset, so a linear neighbour never bleeds in, though the sampling is nearest.
        const inset = white.width >= 3 && white.height >= 3 ? 1 : 0
        const margins = { left: inset, top: inset, right: inset, bottom: inset }
        return new NineSlice(white, margins, { opaqueCenter: color.a === 1, color })
    }


    /**
     * Draw it over a rectangle. Narrower or lower than its margins, the margins shrink in proportion.
     *
     * @param x - The left of the rectangle, in pixels.
     * @param y - The top of the rectangle, in pixels.
     */
    public draw(painter: Painter, x: number, y: number, width: number, height: number): void {
        if(width <= 0 || height <= 0) return
        this.#writeGrid(x, y, width, height)
        if(this.tiling) this.#drawTiles(painter, this.tiling)
        else this.#drawQuads(painter)
    }

    /**
     * Write the zone it covers with opaque pixels when drawn at a size: its bounds less its margins when its
     * center is opaque. None otherwise.
     */
    public opaqueInterior(width: number, height: number, out: Rect): Rect|null {
        if(!this.opaqueCenter) return null
        const { border } = this
        const [left, right] = NineSlice.#fitted(border.left, border.right, width)
        const [top, bottom] = NineSlice.#fitted(border.top, border.bottom, height)
        out.set(left, top, width - left - right, height - top - bottom)
        return out.isEmpty ? null : out
    }


    /** The working values of a draw, so drawing allocates nothing. */
    static readonly #vertices = new Float32Array(VERTEX_COUNT * RAW_VERTEX_SIZE)
    static readonly #tile = new Float32Array(TILE_VERTEX_COUNT * RAW_VERTEX_SIZE)
    static readonly #xs = new Float64Array(4)
    static readonly #ys = new Float64Array(4)
    static readonly #us = new Float64Array(4)
    static readonly #vs = new Float64Array(4)
    static readonly #pair: [number, number] = [0, 0]
    static readonly #columns = new TileRun()
    static readonly #rows = new TileRun()

    /** Are margins whole, and none of them negative? */
    static #isWhole({ left, top, right, bottom }: NineSliceMargins): boolean {
        return [left, top, right, bottom].every(margin => Number.isInteger(margin) && margin >= 0)
    }

    /** Two margins shrunk in proportion to fit a length, in whole pixels, in a shared pair. */
    static #fitted(start: number, end: number, length: number): readonly [number, number] {
        const pair = NineSlice.#pair
        if(start + end <= length){
            pair[0] = start
            pair[1] = end
            return pair
        }
        pair[0] = Math.floor(length * start / (start + end))
        pair[1] = length - pair[0]
        return pair
    }

    /** How many pixels a texel of a margin takes once drawn, none when the margin shows nothing to tell. */
    static #scaleOf(drawn: number, texels: number): number|null {
        return drawn > 0 && texels > 0 ? drawn / texels : null
    }

    /** Write the lines of its grid, on the screen and in its sprite, for a rectangle. */
    #writeGrid(x: number, y: number, width: number, height: number): void {
        const xs = NineSlice.#xs
        const ys = NineSlice.#ys
        const us = NineSlice.#us
        const vs = NineSlice.#vs
        const { sprite, border } = this
        const [left, right] = NineSlice.#fitted(border.left, border.right, width)
        xs[0] = x
        xs[1] = x + left
        xs[2] = x + width - right
        xs[3] = x + width
        const [top, bottom] = NineSlice.#fitted(border.top, border.bottom, height)
        ys[0] = y
        ys[1] = y + top
        ys[2] = y + height - bottom
        ys[3] = y + height
        us[0] = sprite.x
        us[1] = sprite.x + this.left
        us[2] = sprite.x + sprite.width - this.right
        us[3] = sprite.x + sprite.width
        vs[0] = sprite.y
        vs[1] = sprite.y + this.top
        vs[2] = sprite.y + sprite.height - this.bottom
        vs[3] = sprite.y + sprite.height
    }

    /** Draw the grid written in nine quads, its edges and its center stretched. */
    #drawQuads(painter: Painter): void {
        const xs = NineSlice.#xs
        const ys = NineSlice.#ys
        const us = NineSlice.#us
        const vs = NineSlice.#vs
        const vertices = NineSlice.#vertices
        const { r, g, b, a } = this.color
        for(let row = 0; row < 4; row++){
            for(let column = 0; column < 4; column++){
                const v = (row * 4 + column) * RAW_VERTEX_SIZE
                vertices[v] = xs[column]
                vertices[v + 1] = ys[row]
                vertices[v + 2] = 0
                vertices[v + 3] = us[column]
                vertices[v + 4] = vs[row]
                vertices[v + 5] = r
                vertices[v + 6] = g
                vertices[v + 7] = b
                vertices[v + 8] = a
            }
        }
        painter.draw(vertices, INDICES, this.sprite.texture, Primitive.TRIANGLES)
    }

    /** Draw the grid written cell by cell, its edges and its center in tiles, a corner in a single one. */
    #drawTiles(painter: Painter, tiling: Tiling): void {
        const { border } = this
        const top = NineSlice.#scaleOf(border.top, this.top)
        const bottom = NineSlice.#scaleOf(border.bottom, this.bottom)
        const left = NineSlice.#scaleOf(border.left, this.left)
        const right = NineSlice.#scaleOf(border.right, this.right)
        const scalesX = [top ?? bottom ?? 1, top ?? bottom ?? 1, bottom ?? top ?? 1]
        const scalesY = [left ?? right ?? 1, left ?? right ?? 1, right ?? left ?? 1]
        for(let row = 0; row < 3; row++){
            for(let column = 0; column < 3; column++){
                this.#layCell(NineSlice.#columns, NineSlice.#xs, NineSlice.#us, column, scalesX[row], tiling)
                this.#layCell(NineSlice.#rows, NineSlice.#ys, NineSlice.#vs, row, scalesY[column], tiling)
                this.#drawCell(painter, NineSlice.#xs[column], NineSlice.#ys[row])
            }
        }
    }

    /**
     * Lay the tiles of a cell along an axis: the middle of the axis repeats, its ends are single tiles.
     *
     * @param lines - The lines of the grid on the screen along the axis.
     * @param texels - The lines of the grid in the sprite along the axis.
     * @param place - The place of the cell along the axis, from 0 to 2.
     * @param scale - How many pixels a texel takes along the axis.
     */
    #layCell(
        run: TileRun, lines: Float64Array, texels: Float64Array, place: number, scale: number, tiling: Tiling,
    ): void {
        const length = lines[place + 1] - lines[place]
        const from = texels[place]
        const to = texels[place + 1]
        if(place === 1 && length > 0) run.lay(length, (to - from) * scale, from, to, tiling)
        else run.layWhole(length, from, to)
    }

    /** Draw the tiles laid, in a cell starting at a point. */
    #drawCell(painter: Painter, x: number, y: number): void {
        const columns = NineSlice.#columns
        const rows = NineSlice.#rows
        for(let row = 0; row < rows.count; row++){
            rows.select(row)
            for(let column = 0; column < columns.count; column++){
                columns.select(column)
                if(columns.end <= columns.start || rows.end <= rows.start) continue
                this.#tileCorner(0, x + columns.start, y + rows.start, columns.from, rows.from)
                this.#tileCorner(1, x + columns.end, y + rows.start, columns.to, rows.from)
                this.#tileCorner(2, x + columns.end, y + rows.end, columns.to, rows.to)
                this.#tileCorner(3, x + columns.start, y + rows.end, columns.from, rows.to)
                painter.draw(NineSlice.#tile, TILE_INDICES, this.sprite.texture, Primitive.TRIANGLES)
            }
        }
    }

    /** Write a corner of the tile drawn. */
    #tileCorner(corner: number, x: number, y: number, u: number, v: number): void {
        const vertices = NineSlice.#tile
        const at = corner * RAW_VERTEX_SIZE
        const { r, g, b, a } = this.color
        vertices[at] = x
        vertices[at + 1] = y
        vertices[at + 2] = 0
        vertices[at + 3] = u
        vertices[at + 4] = v
        vertices[at + 5] = r
        vertices[at + 6] = g
        vertices[at + 7] = b
        vertices[at + 8] = a
    }
}
