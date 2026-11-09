import type { Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { TextLayout } from "../../../../engine/text"
import { Component, Dial, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme, UiEvent } from "../../../../engine/ui"
import { typeColorOf } from "../look/colors"
import { joinGlyph } from "../look/joinGlyph"
import { TEXT_OUTLINE } from "../look/theme"
import { CompositeCard, cardCount } from "../../sim/card/subs/composite/CompositeCard"
import type { Card } from "../../sim/card/Card"
import { TURN_STEPS, TurnCard } from "../../sim/card/subs/movement/TurnCard"

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

/** The edge of a card played unlimited: white, under the yellow one of a card chosen. */
const UNLIMITED_EDGE = new Color(1, 1, 1)

/** The dial of a turn: its disc, its dot and its needle, and how big it is in each place, as a radius. */
const DIAL = new Dial(TURN_STEPS, {
    face: new Color(0.05, 0.04, 0.08), dot: new Color(0.95, 0.92, 0.86), needle: new Color(0.95, 0.92, 0.86),
})
/** The disc of the dial under the pointer. */
const DIAL_HOVERED = new Color(0.22, 0.2, 0.3)
const HAND_DIAL_RADIUS = 11
const CHAIN_DIAL_RADIUS = 9
const NAME = new Color(0.95, 0.92, 0.86)
const FOOT = new Color(0.6, 0.58, 0.68)

/** The color of the frame of a card the viewer may not see. */
const HIDDEN = new Color(0.4, 0.38, 0.48)

/** The glyph over the limit between two held cards: white, outlined in black. */
const GLYPH = new Color(1, 1, 1)
const GLYPH_OUTLINE = new Color(0, 0, 0)

/** How many times larger than the text the glyph over a limit is drawn. */
const GLYPH_SCALE = 2

/** How wide the strip of the color of what a card takes is, on its right, in virtual pixels. */
const INPUT_STRIP = 3

/** The veil over a card that cannot be picked. */
const VEIL = new Color(0.05, 0.04, 0.08, 0.6)

/** How many cards a card holds, at every depth, drawn at their full width: more are drawn narrower. */
const FULL_HELD = 3

/** The share of its width a card held among too many keeps. */
const NARROW_SHARE = 0.6

/**
 * A card, drawn as one: a band of the color of its output, its name, the output at its foot when there is
 * room, and a strip of the color of its input down its right side. A card holding cards is drawn in a frame
 * of the color of its output, its band and its name on top, the cards it holds side by side under them, each
 * drawn the same way: narrower when there are many, and alone in the frame when it has no name of its own.
 * Over each limit between two of them is a glyph telling how they are held. A card the viewer may not see is
 * drawn from its back, a "?" on it. A click on it is told, and so is its hover, so its preview and its text
 * can be shown.
 */
export class CardView extends Component {


    /** What a click does, nothing when none. */
    public onPick: (() => void)|null = null

    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null

    /**
     * What a click on the dial of a turn does, given the step it points at, nothing when none: the dial then
     * only shows the direction, and the click is a pick as anywhere else on the card.
     */
    public onDial: ((step: number) => void)|null = null

    /** Does it only keep its place, drawing nothing: a card still on its way there? */
    public ghost = false

    /**
     * Is it a card the unit plays as often as it wishes? It then shows a white edge. Only a look: what the
     * simulation does with the card does not depend on it.
     */
    public get unlimited(): boolean { return this.#unlimited }

    public set unlimited(unlimited: boolean){
        if(unlimited === this.#unlimited) return
        this.#unlimited = unlimited
        this.invalidate()
    }

    /** The deck it comes from, by its place, which colors its face, none for a card from elsewhere. */
    public deck: number|null = null

    /** Is it being looked at? It then shows the edge of a card lifted. */
    public lit = false

    /** What crosses it out, in its middle, none for a card that is not. */
    public cross: Sprite|null = null

    /**
     * What tells it is chosen, none when it is not: a yellow edge over its own, and the text, which may be
     * empty, in yellow on a black outline, in its top left corner. As the activation of the icon of an item.
     */
    public get activation(): string|null { return this.#activation }

    public set activation(activation: string|null){
        if(activation === this.#activation) return
        this.#activation = activation
        this.invalidate()
    }

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
    ){
        super()
        this.#text = new TextLayout(theme.font, theme.textScale)
        this.#glyphText = new TextLayout(theme.font, theme.textScale * GLYPH_SCALE)
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
        this.#paintCard(painter, card, 0, 0, width, height)
        if(card && card === this.card) this.#paintDial(painter, width)
        // The edge of a card chosen or looked at goes over its own, so a frame of the color of its cards stays.
        if(this.unlimited) this.#paintEdge(painter, width, height, UNLIMITED_EDGE)
        if(this.#activation !== null || this.lit) this.#paintEdge(painter, width, height, PICKED_EDGE)
        if(this.#activation) this.#text.drawOutlined(painter, this.#activation, 2, 1, PICKED_EDGE, TEXT_OUTLINE)
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
        if(event.type === "pointer-move"){
            // The dial answers the pointer only when a click on it does something of its own.
            const over = this.onDial !== null && this.#overDialAt(event.x, event.y)
            if(over !== this.#overDial){
                this.#overDial = over
                this.invalidate()
            }
            return
        }
        if(event.type !== "pointer-down" || event.button !== 0) return
        event.consume()
        if(this.onDial && this.#overDialAt(event.x, event.y)){
            // The center of the dial points nowhere: the click is the dial's all the same, and changes nothing.
            const step = this.#dialStepAt(event.x, event.y)
            if(step !== null) this.onDial(step)
            return
        }
        this.onPick?.()
    }

    /** Is a point of the card on the disc of the dial of a turn, its center included? */
    #overDialAt(x: number, y: number): boolean {
        const spot = this.#dialSpot()
        return spot !== null && DIAL.contains(x - this.bounds.width / 2, y - spot.cy, spot.radius)
    }

    /** The step of the dial a point of the card points at, none at the center and off the dial. */
    #dialStepAt(x: number, y: number): number|null {
        const spot = this.#dialSpot()
        if(!spot || !this.#overDialAt(x, y)) return null
        return DIAL.stepAt(x - this.bounds.width / 2, y - spot.cy, spot.radius)
    }

    protected override hoverChanged(): void {
        if(!this.hovered) this.#overDial = false
        this.invalidate()
        this.onHover?.(this.hovered)
    }


    readonly #text: TextLayout

    readonly #glyphText: TextLayout


    #dimmed = false

    /** Is the pointer over the dial, which then answers it instead of the card? */
    #overDial = false
    #unlimited = false
    #activation: string|null = null

    /**
     * Where the dial of a turn is, and how big: centered under the one line of its name. None for a card that
     * is not a turn, and for one too small to hold a dial.
     */
    #dialSpot(): { cy: number, radius: number }|null {
        if(!(this.card instanceof TurnCard) || this.place === "mini") return null
        const look = CARD_LOOKS[this.place]
        const radius = this.place === "hand" ? HAND_DIAL_RADIUS : CHAIN_DIAL_RADIUS
        const top = 1 + look.band + look.padding + this.#text.lineHeight + 1
        return { cy: top + radius, radius }
    }

    /** Draw the dial of a turn, its needle toward the direction of the card. */
    #paintDial(painter: Painter, width: number): void {
        const spot = this.#dialSpot()
        if(!spot || !(this.card instanceof TurnCard)) return
        DIAL.draw(
            painter, Math.round(width / 2), spot.cy, spot.radius, this.card.step,
            this.#overDial ? DIAL_HOVERED : undefined,
        )
    }

    /** Draw the edge of a card chosen: one pixel over the border of its rectangle. */
    #paintEdge(painter: Painter, width: number, height: number, color: Color): void {
        painter.setTint(color)
        painter.rect(0, 0, width, 1)
        painter.rect(0, height - 1, width, 1)
        painter.rect(0, 1, 1, height - 2)
        painter.rect(width - 1, 1, 1, height - 2)
    }

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
     */
    #paintCard(painter: Painter, card: Card|null, x: number, y: number, width: number, height: number): void {
        const look = CARD_LOOKS[this.place]
        // A card is read as its output, the back as a hidden one.
        const word = card ? card.output.name : ""
        const contents = card?.contents
        const color = card ? typeColorOf(card.output) : HIDDEN
        // A card holding cards without a name of its own is drawn as them alone, in its frame.
        const bare = card instanceof CompositeCard && !card.named
        painter.setTint(contents ? color : EDGE)
        painter.rect(x, y, width, height)
        let top = y + 1
        if(!contents || !bare){
            const faces = this.hovered && !this.#overDial ? FACES_HOVERED : FACES
            painter.setTint(card ? faces[(this.deck ?? 0) % faces.length] : BACK)
            painter.rect(x + 1, y + 1, width - 2, height - 2)
            painter.setTint(color)
            painter.rect(x + 1, y + 1, width - 2, look.band)
            // What a card takes is the strip down its right side. A card holding cards has none: they fill it.
            const input = !contents && card?.input ? card.input : null
            if(input){
                painter.setTint(typeColorOf(input))
                painter.rect(x + width - 1 - INPUT_STRIP, y + 1 + look.band, INPUT_STRIP, height - 2 - look.band)
            }
            const textWidth = width - (input ? INPUT_STRIP : 0)
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
                ? this.#paintName(painter, card ? card.name : "?", x, y + 1 + look.band, textWidth, lines)
                : y + 1 + look.band
            if(foot){
                painter.setTint(FOOT)
                const foot = text.fit(word, textWidth - 2 * look.padding)
                text.draw(painter, foot, x + look.padding, y + height - look.padding - text.lineHeight)
            }
        }
        if(!contents) return
        let left = x + 1
        const limits: number[] = []
        for(const each of contents){
            const eachWidth = this.#widthOf(each)
            this.#paintCard(painter, each, left, top, eachWidth, y + height - 1 - top)
            left += eachWidth
            if(each !== contents[contents.length - 1]) limits.push(left)
        }
        const glyph = joinGlyph(card!)
        if(glyph) for(const at of limits) this.#paintGlyph(painter, glyph, at, top + (y + height - 1 - top) / 2)
    }

    /** Draw a glyph centered on a point: white, over a black outline. */
    #paintGlyph(painter: Painter, glyph: string, cx: number, cy: number): void {
        const text = this.place === "mini" ? this.#text : this.#glyphText
        const x = Math.round(cx - text.widthOf(glyph) / 2)
        const y = Math.round(cy - text.lineHeight / 2)
        painter.setTint(GLYPH_OUTLINE)
        for(const dx of [-1, 0, 1]) for(const dy of [-1, 0, 1]){
            if(dx !== 0 || dy !== 0) text.draw(painter, glyph, x + dx, y + dy)
        }
        painter.setTint(GLYPH)
        text.draw(painter, glyph, x, y)
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
