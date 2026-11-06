import { Primitive, RAW_VERTEX_SIZE } from "../../../../engine/gpu"
import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"

import type { PnjRect } from "./PnjLayout"
import { PnjPose } from "./PnjPose"
import type { PnjPart, PnjRig } from "./PnjRig"

/**
 * How finely the body and its skin are cut to bend, in cells across and down. The cells are short on the
 * height, where the body curves; the head is never deformed, one cell is enough.
 */
const BODY_CELLS = { across: 8, down: 48 } as const
const SKIN_CELLS = { across: 6, down: 12 } as const
const HEAD_CELLS = { across: 1, down: 1 } as const

/**
 * A character painted flat, drawn as a cut-out puppet: its body bent, squashed and turned as its
 * {@link PnjPose} says, the skin of its body over it, then its head on its neck. Its clothes take a color.
 *
 * @remarks
 * It draws in its own coordinates, pixels of the painting, its origin between its feet: the caller
 * translates and scales the painter to where and how large it stands. The body and its skin are cut in a
 * grid whose points are moved one by one, so the bend is a curve, not a fold.
 */
export class Pnj extends PnjPose {


    constructor(
        /** The textures and the layout it is drawn from. */
        public readonly rig: PnjRig,
    ){
        super(rig.layout)
        this.#body = new PartMesh(rig.layout.body, rig.body, rig.shrink, BODY_CELLS)
        this.#skin = new PartMesh(rig.layout.skin, rig.skin, rig.shrink, SKIN_CELLS)
        this.#head = new PartMesh(rig.layout.head, rig.head, rig.shrink, HEAD_CELLS)
    }


    /**
     * The color of its clothes, none to keep those painted. The body takes its hue, keeping the light and
     * shade of the painting; its skin and its head keep theirs.
     */
    public get clothes(): Color|null { return this.#clothes }

    public set clothes(clothes: Color|null){
        this.#clothes = clothes?.clone() ?? null
    }

    /**
     * Draw it in its pose, its origin between its feet, with the blend and the tint of the painter.
     *
     * @param betweenBodyAndSkin - Called once the body is drawn and before its skin, to draw under the hands
     * what they hold.
     */
    public draw(painter: Painter, betweenBodyAndSkin?: () => void): void {
        const clothes = this.#clothes
        painter.push()
        if(clothes) painter.setColorMode("hue")
        this.#body.draw(painter, this.#bodyPoint, clothes ?? WHITE)
        painter.pop()
        betweenBodyAndSkin?.()
        this.#skin.draw(painter, this.#bodyPoint, WHITE)
        this.#head.draw(painter, this.#headPoint, WHITE)
    }


    #clothes: Color|null = null
    readonly #body: PartMesh
    readonly #skin: PartMesh
    readonly #head: PartMesh

    /** How the points of the body and of the head move, kept so drawing allocates nothing. */
    readonly #bodyPoint: PointMove = (x, y, out) => this.bodyPointInto(x, y, out)
    readonly #headPoint: PointMove = (x, y, out) => this.headPointInto(x, y, out)
}

/** Where a point of the painting lands, written in `out`. */
type PointMove = (x: number, y: number, out: { x: number, y: number }) => void

/** The color that leaves a texture as it is. */
const WHITE = new Color()

/** The grid a part is drawn with, its points moved where the pose puts them at each drawing. */
class PartMesh {


    constructor(
        public readonly rect: PnjRect,
        public readonly part: PnjPart,
        public readonly shrink: number,
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
        const { rect, cells, shrink } = this
        const vertices = this.#vertices
        const point = this.#point
        const alpha = color.a * this.part.opacity
        let v = 0
        for(let row = 0; row <= cells.down; row++){
            const y = rect.y + rect.height * row / cells.down
            for(let column = 0; column <= cells.across; column++){
                const x = rect.x + rect.width * column / cells.across
                pointInto(x, y, point)
                vertices[v] = point.x
                vertices[v + 1] = point.y
                vertices[v + 2] = 0
                vertices[v + 3] = (x - rect.x) / shrink
                vertices[v + 4] = (y - rect.y) / shrink
                vertices[v + 5] = color.r
                vertices[v + 6] = color.g
                vertices[v + 7] = color.b
                vertices[v + 8] = alpha
                v += RAW_VERTEX_SIZE
            }
        }
        painter.draw(vertices, this.#indices, this.part.texture, Primitive.TRIANGLES)
    }


    /** The vertices, written again at each drawing, so drawing allocates nothing. */
    readonly #vertices: Float32Array
    readonly #indices: Uint16Array
    readonly #point = { x: 0, y: 0 }
}
