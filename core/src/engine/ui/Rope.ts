import { Primitive, RAW_VERTEX_SIZE } from "../gpu"
import type { Painter, Point, Sprite } from "../gpu"

import { TileRun } from "./TileRun"
import type { Tiling } from "./TileRun"

/** The indices of a tile of a rope, two triangles over its corners in order. */
const QUAD_INDICES = [0, 1, 2, 0, 2, 3] as const

/** The vertices of a tile of a rope. */
const VERTEX_COUNT = 4

/**
 * A line drawn with a picture: the height of its sprite runs along the line, its width spans the whole
 * thickness. The picture keeps its aspect ratio as far as the tiling lets it: a sprite twice as high as wide
 * takes three tiles on a line six times as long as thick, a line too short for one tile squeezes it.
 *
 * @remarks
 * It is tinted by the painter, as the shapes are, so one picture draws lines of several colors.
 */
export class Rope {


    constructor(
        /** The picture it is drawn with, ideally in the atlas of what is drawn around. */
        public readonly sprite: Sprite,

        /** How its picture repeats along the line. */
        public readonly tiling: Tiling = {},
    ){}


    /**
     * Draw it between two points. Two points in the same place, or no thickness, draw nothing.
     *
     * @param thickness - How thick it is, in pixels.
     */
    public draw(painter: Painter, a: Point, b: Point, thickness: number): void {
        const length = Math.hypot(b.x - a.x, b.y - a.y)
        if(length === 0 || thickness <= 0) return
        const sprite = this.sprite
        const alongX = (b.x - a.x) / length
        const alongY = (b.y - a.y) / length
        const acrossX = -alongY * thickness / 2
        const acrossY = alongX * thickness / 2
        const run = Rope.#run
        const tile = sprite.height * thickness / sprite.width
        run.lay(length, tile, sprite.y, sprite.y + sprite.height, this.tiling)
        const left = sprite.x
        const right = sprite.x + sprite.width
        for(let index = 0; index < run.count; index++){
            run.select(index)
            const startX = a.x + alongX * run.start
            const startY = a.y + alongY * run.start
            const endX = a.x + alongX * run.end
            const endY = a.y + alongY * run.end
            Rope.#corner(0, startX - acrossX, startY - acrossY, left, run.from)
            Rope.#corner(1, startX + acrossX, startY + acrossY, right, run.from)
            Rope.#corner(2, endX + acrossX, endY + acrossY, right, run.to)
            Rope.#corner(3, endX - acrossX, endY - acrossY, left, run.to)
            painter.draw(Rope.#vertices, QUAD_INDICES, sprite.texture, Primitive.TRIANGLES)
        }
    }


    /** The working values of a draw, so drawing allocates nothing. */
    static readonly #vertices = new Float32Array(VERTEX_COUNT * RAW_VERTEX_SIZE).fill(1)
    static readonly #run = new TileRun()

    /** Write a corner of the tile drawn, white so only the tint colors it. */
    static #corner(corner: number, x: number, y: number, u: number, v: number): void {
        const vertices = Rope.#vertices
        const at = corner * RAW_VERTEX_SIZE
        vertices[at] = x
        vertices[at + 1] = y
        vertices[at + 2] = 0
        vertices[at + 3] = u
        vertices[at + 4] = v
    }
}
