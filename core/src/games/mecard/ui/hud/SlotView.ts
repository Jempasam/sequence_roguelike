import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { TextLayout } from "../../../../engine/text"
import { Component, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"

import { CARD_LOOKS } from "./CardView"
import type { CardPlace } from "./CardView"

const WHITE = new Color(1, 1, 1)

/**
 * A place for a card, as large as one and only outlined in white, with a text in its middle, such as how many
 * cards can still be put there.
 */
export class SlotView extends Component {


    constructor(
        public readonly theme: Theme,

        /** What it tells, in its middle. */
        public readonly label: string,

        /** The size of the card it stands for. */
        public readonly place: CardPlace = "chain",
    ){
        super()
        this.#text = new TextLayout(theme.font, theme.textScale)
    }


    protected computeHint(): SizeHint {
        const { width, height } = CARD_LOOKS[this.place]
        return sizeHint(width, height)
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        painter.push()
        painter.setWhitePixel(this.theme.white)
        painter.setTint(WHITE)
        painter.rect(0, 0, width, 1)
        painter.rect(0, height - 1, width, 1)
        painter.rect(0, 1, 1, height - 2)
        painter.rect(width - 1, 1, 1, height - 2)
        const text = this.#text
        text.draw(painter, this.label, Math.floor((width - text.widthOf(this.label)) / 2), Math.floor((height - text.lineHeight) / 2))
        painter.pop()
    }


    readonly #text: TextLayout
}
