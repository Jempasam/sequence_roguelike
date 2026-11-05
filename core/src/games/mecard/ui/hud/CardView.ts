import type { Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { TextLayout } from "../../../../engine/text"
import { Component, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme, UiEvent } from "../../../../engine/ui"
import { HIDDEN_FAMILY } from "../../sim/card/Family"
import { cardCount } from "../../sim/card/subs/composite/CompositeCard"
import type { Card } from "../../sim/card/Card"

/** Where a card is shown, which sets its size: the hand, the chain being put together, the other chains. */
export type CardPlace = "hand"|"chain"|"mini"

/** How a card is drawn in a place. */
interface CardLook {
    /** Its size, in virtual pixels. */
    readonly width: number
    readonly height: number

    /** The space between its frame and its text, in virtual pixels. */
    readonly padding: number

    /** How tall the band of color on its top is, in virtual pixels. */
    readonly band: number

    /** How many lines of its name it shows at most. */
    readonly lines: number

    /** Does it show its family at its foot? */
    readonly foot: boolean
}

/** How a card is drawn in each place. */
export const CARD_LOOKS: Readonly<Record<CardPlace, CardLook>> = {
    hand: { width: 44, height: 56, padding: 3, band: 4, lines: 4, foot: true },
    chain: { width: 40, height: 50, padding: 3, band: 4, lines: 3, foot: true },
    mini: { width: 32, height: 24, padding: 2, band: 2, lines: 2, foot: false },
}

/** The face of a card by the deck it comes from, in turn, in the tones of the backs of the decks. */
const FACES: readonly Color[] = [
    new Color(0.16, 0.14, 0.22), new Color(0.25, 0.1, 0.14),
    new Color(0.08, 0.2, 0.16), new Color(0.25, 0.18, 0.07),
]

/** The same, under the pointer. */
const FACES_HOVERED: readonly Color[] = [
    new Color(0.24, 0.21, 0.32), new Color(0.37, 0.16, 0.21),
    new Color(0.13, 0.3, 0.24), new Color(0.37, 0.27, 0.11),
]

const BACK = new Color(0.1, 0.09, 0.14)
const EDGE = new Color(0.05, 0.04, 0.08)
const PICKED_EDGE = new Color(1, 0.85, 0.35)
const NAME = new Color(0.95, 0.92, 0.86)
const FOOT = new Color(0.6, 0.58, 0.68)

/** The veil over a card that cannot be picked. */
const VEIL = new Color(0.05, 0.04, 0.08, 0.6)

/** How many cards a card holds, at every depth, drawn at their full width: more are drawn narrower. */
const FULL_HELD = 3

/** The share of its width a card held among too many keeps. */
const NARROW_SHARE = 0.6

/**
 * A card, drawn as one: a band of the color of its family, its name, and the family at its foot when there
 * is room. A card holding cards is drawn in a frame of the color of its family, its band and its name on
 * top, the cards it holds side by side under them, each drawn the same way: narrower when there are many,
 * and alone in the frame for a bare family, as a fusion. A card the viewer may not see is drawn from its
 * back, a "?" on it. A click on it is told, and so is its hover, so its preview and its text can be shown.
 */
export class CardView extends Component {


    /** What a click does, nothing when none. */
    public onPick: (() => void)|null = null

    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null

    /** Does it only keep its place, drawing nothing: a card still on its way there? */
    public ghost = false

    /** The deck it comes from, by its place, which colors its face, none for a card from elsewhere. */
    public deck: number|null = null

    /** Is it being looked at? It then shows the edge of a card lifted. */
    public lit = false

    /** What crosses it out, in its middle, none for a card that is not. */
    public cross: Sprite|null = null

    /** Is it drawn behind a veil, since it cannot be picked? */
    public get dimmed(): boolean { return this.#dimmed }

    public set dimmed(dimmed: boolean){
        if(dimmed === this.#dimmed) return
        this.#dimmed = dimmed
        this.invalidate()
    }

    constructor(
        public readonly theme: Theme,

        /** The card, none when the viewer may not see it. */
        public readonly card: Card|null,

        /** Where it is shown. */
        public readonly place: CardPlace,

        /** Is it lifted, waiting for a slot? */
        public readonly picked = false,
    ){
        super()
        this.#text = new TextLayout(theme.font, theme.textScale)
    }


    protected override get interactive(): boolean { return true }

    protected computeHint(): SizeHint {
        return sizeHint(this.#widthOf(this.card), CARD_LOOKS[this.place].height)
    }

    protected paint(painter: Painter): void {
        if(this.ghost) return
        const { width, height } = this.bounds
        this.paintFace(painter, width, height)
    }

    /** Draw the card, or another one, at the origin, in a size. */
    protected paintFace(painter: Painter, width: number, height: number, card = this.card): void {
        painter.push()
        painter.setWhitePixel(this.theme.white)
        this.#paintCard(painter, card, 0, 0, width, height, this.picked || this.lit)
        if(this.dimmed){
            painter.setTint(VEIL)
            painter.rect(0, 0, width, height)
        }
        if(this.cross){
            const x = Math.floor((width - this.cross.width) / 2)
            painter.sprite(this.cross, x, Math.floor((height - this.cross.height) / 2))
        }
        painter.pop()
    }

    protected override handle(event: UiEvent): void {
        if(event.type !== "pointer-down" || event.button !== 0) return
        event.consume()
        this.onPick?.()
    }

    protected override hoverChanged(): void {
        this.invalidate()
        this.onHover?.(this.hovered)
    }


    readonly #text: TextLayout

    /** The color of the family of the card being drawn. */
    readonly #familyColor = new Color()

    #dimmed = false

    /** How wide a card holding no card is drawn, in virtual pixels: narrower among too many. */
    get #plainWidth(): number {
        const { width } = CARD_LOOKS[this.place]
        return !this.card || cardCount(this.card) <= FULL_HELD ? width : Math.round(width * NARROW_SHARE)
    }

    /** How wide a card is drawn, none for its back, in virtual pixels: the cards it holds side by side. */
    #widthOf(card: Card|null): number {
        if(!card?.contents) return this.#plainWidth
        return card.contents.reduce((width, each) => width + this.#widthOf(each), 2)
    }

    /**
     * Draw one card, none for its back, in a rectangle of the component, and the cards it holds in it.
     *
     * @param picked - Is it drawn lifted? Only the card of the component is: the cards it holds are not.
     */
    #paintCard(
        painter: Painter, card: Card|null,
        x: number, y: number, width: number, height: number, picked: boolean,
    ): void {
        const look = CARD_LOOKS[this.place]
        const family = card ? card.family : HIDDEN_FAMILY
        const contents = card?.contents
        const { r, g, b } = family.color
        const color = this.#familyColor.set(r, g, b)
        painter.setTint(picked ? PICKED_EDGE : contents ? color : EDGE)
        painter.rect(x, y, width, height)
        let top = y + 1
        if(!contents || !family.bare){
            const faces = this.hovered ? FACES_HOVERED : FACES
            painter.setTint(card ? faces[(this.deck ?? 0) % faces.length] : BACK)
            painter.rect(x + 1, y + 1, width - 2, height - 2)
            painter.setTint(color)
            painter.rect(x + 1, y + 1, width - 2, look.band)
            // A card holding cards keeps one line for its name when the cards it holds keep one for theirs
            // under it, its band alone otherwise. A card held is shorter: it keeps the lines it has room for,
            // none when it has none, and its foot when one line is left beside it.
            const text = this.#text
            const free = height - 2 - look.band - 2 * look.padding
            const foot = !contents && look.foot && free >= 2 * text.lineHeight
            const room = Math.floor((free - (foot ? text.lineHeight : 0)) / text.lineHeight)
            const named = free - text.lineHeight >= 2 + look.band + 2 * look.padding + text.lineHeight
            const lines = contents ? (named ? 1 : 0) : Math.max(0, Math.min(look.lines, room))
            top = lines > 0
                ? this.#paintName(painter, card ? card.name : "?", x, y + 1 + look.band, width, lines)
                : y + 1 + look.band
            if(foot){
                painter.setTint(FOOT)
                const foot = text.fit(family.word, width - 2 * look.padding)
                text.draw(painter, foot, x + look.padding, y + height - look.padding - text.lineHeight)
            }
        }
        if(!contents) return
        let left = x + 1
        for(const each of contents){
            const eachWidth = this.#widthOf(each)
            this.#paintCard(painter, each, left, top, eachWidth, y + height - 1 - top, false)
            left += eachWidth
        }
    }

    /**
     * Draw the name of a card under its band, on a number of lines at most.
     *
     * @returns Where the room under the name starts, in virtual pixels.
     */
    #paintName(painter: Painter, name: string, x: number, y: number, width: number, lines: number): number {
        const { padding } = CARD_LOOKS[this.place]
        const text = this.#text
        const shown = text.lines(name, width - 2 * padding).slice(0, lines)
        painter.setTint(NAME)
        shown.forEach((line, index) => {
            text.draw(painter, line, x + padding, y + padding + index * text.lineHeight)
        })
        return y + 2 * padding + shown.length * text.lineHeight
    }
}
