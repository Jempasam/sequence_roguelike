import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { TextLayout } from "../../../../engine/text"
import { Component, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme, UiEvent } from "../../../../engine/ui"

import { CARD_LOOKS } from "./CardView"
import type { CardPlace } from "./CardView"

/** The length of a dash of the outline, and of the gap after it, in virtual pixels. */
const DASH = 2

const EDGE = new Color(0.35, 0.33, 0.45)
const LIT_EDGE = new Color(1, 0.85, 0.35)
const LIT_FACE = new Color(0.3, 0.26, 0.14)
const WORD = new Color(0.55, 0.53, 0.63)

/**
 * An empty slot of a placed card: a dashed outline the size of a card of its place, with the type it takes.
 * Lit when the lifted card fits in it, and a click on it then puts the card there.
 */
export class SlotView extends Component {


    /** What a click does, nothing when none. */
    public onPick: (() => void)|null = null

    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null

    constructor(
        public readonly theme: Theme,

        /** The name of the type it takes. */
        public readonly takes: string,

        /** Does the lifted card fit in it? */
        public readonly lit: boolean,

        /** Where it is shown, which sets its size. */
        public readonly place: CardPlace,
    ){
        super()
        this.#text = new TextLayout(theme.font, theme.textScale)
    }


    protected override get interactive(): boolean { return true }

    protected computeHint(): SizeHint {
        const { width, height } = CARD_LOOKS[this.place]
        return sizeHint(width, height)
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        painter.push()
        painter.setWhitePixel(this.theme.white)
        if(this.lit){
            painter.setTint(LIT_FACE)
            painter.rect(1, 1, width - 2, height - 2)
        }
        painter.setTint(this.lit ? LIT_EDGE : EDGE)
        for(let x = 0; x < width; x += 2 * DASH){
            painter.rect(x, 0, Math.min(DASH, width - x), 1)
            painter.rect(x, height - 1, Math.min(DASH, width - x), 1)
        }
        for(let y = 0; y < height; y += 2 * DASH){
            painter.rect(0, y, 1, Math.min(DASH, height - y))
            painter.rect(width - 1, y, 1, Math.min(DASH, height - y))
        }
        const text = this.#text
        const word = text.fit(this.takes, width - 4)
        painter.setTint(this.lit ? LIT_EDGE : WORD)
        const left = Math.floor((width - text.widthOf(word)) / 2)
        text.draw(painter, word, left, Math.floor((height - text.lineHeight) / 2))
        painter.pop()
    }

    protected override handle(event: UiEvent): void {
        if(event.type !== "pointer-down" || event.button !== 0) return
        event.consume()
        this.onPick?.()
    }

    protected override hoverChanged(): void {
        this.onHover?.(this.hovered)
    }


    readonly #text: TextLayout
}
