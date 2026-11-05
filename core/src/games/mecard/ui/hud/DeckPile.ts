import type { Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Component, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"

import { CARD_LOOKS } from "./CardView"

/** How many cards of a pile each card drawn under the top one stands for. */
const CARDS_PER_LAYER = 5

/** How many cards are drawn under the top one at most: as far as a pile grows. */
const MAX_LAYERS = 6

/** How tall a pile is at its thickest, in virtual pixels. */
export const PILE_HEIGHT = CARD_LOOKS.hand.height + MAX_LAYERS

const BACK = new Color(0.16, 0.14, 0.26)
const EDGE = new Color(0.05, 0.04, 0.08)
const EMPTY = new Color(0.3, 0.28, 0.36)
const NEXT = new Color(1, 0.85, 0.35)
const WHITE = new Color(1, 1, 1)

/**
 * A draw pile, drawn as cards from their back, one on the other: the more cards it holds, the thicker, and
 * only an outline when none is left. Its hover is told, to say how many cards it holds.
 */
export class DeckPile extends Component {


    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null

    constructor(
        public readonly theme: Theme,

        /** The back of a card, none until it is loaded: a plain card is drawn then. */
        public readonly back: Sprite|null,

        /** How many cards it holds. */
        public readonly count: number,

        /** Is it the next one drawn from, among several? */
        public readonly next: boolean,
    ){
        super()
    }


    /** How many cards are drawn under the top one. */
    public get layers(): number {
        return Math.min(MAX_LAYERS, Math.ceil(this.count / CARDS_PER_LAYER))
    }

    protected override get interactive(): boolean { return true }

    protected computeHint(): SizeHint {
        return sizeHint(CARD_LOOKS.hand.width + MAX_LAYERS, PILE_HEIGHT)
    }

    protected paint(painter: Painter): void {
        const { width, height } = CARD_LOOKS.hand
        painter.push()
        painter.setWhitePixel(this.theme.white)
        if(this.count === 0){
            this.#frame(painter, MAX_LAYERS, width, height, EMPTY)
            painter.pop()
            return
        }
        // From the bottom card up, each one a pixel up and to the left of the one under it.
        for(let layer = this.layers; layer >= 0; layer--){
            this.#card(painter, MAX_LAYERS - layer, width, height)
        }
        if(this.next) this.#frame(painter, MAX_LAYERS, width, height, NEXT)
        painter.pop()
    }

    protected override hoverChanged(): void {
        this.onHover?.(this.hovered)
    }


    /** One card from its back, at a distance from the corner of the pile. */
    #card(painter: Painter, shift: number, width: number, height: number): void {
        if(!this.back){
            painter.setTint(EDGE)
            painter.rect(shift, shift, width, height)
            painter.setTint(BACK)
            painter.rect(shift + 1, shift + 1, width - 2, height - 2)
            return
        }
        painter.push()
        painter.translate(shift, shift)
        painter.scale(width / this.back.width, height / this.back.height)
        painter.setTint(WHITE)
        painter.sprite(this.back, 0, 0)
        painter.pop()
    }

    /** The outline of a card, at a distance from the corner of the pile. */
    #frame(painter: Painter, shift: number, width: number, height: number, color: Color): void {
        painter.setTint(color)
        painter.rect(shift, shift, width, 1)
        painter.rect(shift, shift + height - 1, width, 1)
        painter.rect(shift, shift, 1, height)
        painter.rect(shift + width - 1, shift, 1, height)
    }
}
