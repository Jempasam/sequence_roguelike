import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Component, EMPTY_HINT, NineSlice, Rect } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"
import type { Battle } from "../../sim/battle/Battle"

import { paperFrame } from "../look/paper"
import type { UnitSprites } from "../look/UnitSprites"
import type { BoardView, WorldRect } from "./BoardView"

/** The whole factor the paper under the arena is drawn at. */
const PAPER_SCALE = 1

/** What the arena lies on while the paper is not loaded. */
const BARE = new Color(0.1, 0.09, 0.13)

/**
 * The arena of the battle as a component of the interface: the worn paper of the maps, opaque, and the
 * board drawn on it, in the room its borders leave.
 *
 * @remarks
 * It is opaque over its paper, so a frame drawn again starts from it, and nothing below. It takes no
 * pointer: a click on the arena is read by the screen. The board moves at every frame, so the screen
 * invalidates it at each one.
 */
export class ArenaView extends Component {


    constructor(
        theme: Theme,

        /** What it draws on the paper. */
        public readonly board: BoardView,

        /** The battle whose arena it draws. */
        public readonly battle: Battle,

        /** Where the paper comes from, once loaded. */
        public readonly sprites: UnitSprites,
    ){
        super()
        this.#bare = NineSlice.flat(theme.white, BARE)
    }


    /**
     * The room of the board in its own coordinates when it has a size: that less the borders of the paper.
     * Told the size rather than read from the bounds, which are laid out a frame later.
     */
    public roomIn(width: number, height: number): WorldRect {
        const { border } = this.#frame()
        return {
            left: border.left, top: border.top,
            right: Math.max(border.left, width - border.right), bottom: Math.max(border.top, height - border.bottom),
        }
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        this.#frame().draw(painter, 0, 0, width, height)
        painter.push()
        painter.clip(0, 0, width, height)
        this.board.draw(painter, this.battle)
        painter.pop()
    }

    protected override opaqueRect(): Readonly<Rect>|null {
        const { width, height } = this.bounds
        return this.#frame().opaqueInterior(width, height, this.#opaque)
    }


    readonly #bare: NineSlice
    readonly #opaque = new Rect()
    #paper: NineSlice|null = null

    /** The paper as a frame once loaded, else a bare color. */
    #frame(): NineSlice {
        const paper = this.sprites.paper
        if(!paper) return this.#bare
        this.#paper ??= paperFrame(paper, PAPER_SCALE)
        return this.#paper
    }
}
