import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel, Scroll } from "../../../../engine/ui"
import type { Component, Layer, Theme, UiRoot } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"

import { DetailBox } from "../hud/DetailBox"
import { heartText, HeartView } from "../hud/HeartView"
import { CardView } from "../hud/CardView"
import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"
import { GUIDE } from "./guide"
import type { GuideBlock } from "./GuideBlocks"

/** The color behind the guide. */
const BACKDROP = new Color(0.12, 0.11, 0.17)

/** The space around the guide and between its parts, in virtual pixels. */
const MARGIN = 4

/** The widest the text of the guide is, in virtual pixels: a longer line is tiring to read. */
const MAX_WIDTH = 320

/** The space between two blocks of the guide, in virtual pixels. */
const BLOCK_GAP = 6

/** The size the scroll asks for: it takes whatever room its panel gives it. */
const SCROLL_SIZE = 40

/** How tall the box that says what is hovered is, in virtual pixels. */
const DETAIL_HEIGHT = 44

/** What the guide asks of its game. */
export interface GuideHost {
    /** Leave the guide, back to the main menu. */
    leave(): void
}

/**
 * The guide: a long text that scrolls, with the cards and the hearts it speaks of drawn inside it, a button
 * back to the menu, and at the foot of the screen a box that says what the pointer is over: a card or a heart
 * drawn, or an object or a keyword named in the text.
 */
export class GuideScreen {


    /** Is the guide shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        if(visible === this.visible) return
        this.#layer.content.visible = visible
        if(visible){
            this.#scroll.offset = 0
            this.#size = ""
        }
    }

    /** What scrolls the text. */
    public get scroll(): Scroll { return this.#scroll }

    /** The button back to the menu. */
    public get backButton(): Button { return this.#back }

    /** The box that says what is hovered. */
    public get detail(): DetailBox { return this.#detail }

    constructor(
        public readonly theme: Theme,

        /** The interface the guide lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: GuideHost,

        /** What the guide is made of, in the order it is read: the guide of the game by default. */
        public readonly blocks: readonly GuideBlock[] = GUIDE,
    ){
        this.#layer = ui.addLayer("guide")
        this.#layer.content.visible = false
        this.#scroll = new Scroll(theme, { width: SCROLL_SIZE, height: SCROLL_SIZE })
        this.#back = new Button(theme, "Retour")
        this.#back.onActivate = () => host.leave()
        this.#detail = new DetailBox(theme, { color: DIM_TEXT, scrolled: true })
    }


    /** Lay the guide out again when the interface changed size, and let the box of details read the input. */
    public frame(input: InputFrame): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size !== this.#size){
            this.#size = size
            this.refresh()
        }
        const hovered = this.#textUnderPointer()
        // Told only when it changes, so a word of the text, which tells the box itself, is not told over.
        if(hovered !== this.#last){
            this.#last = hovered
            this.#detail.tell(hovered)
        }
        this.#detail.frame(input, this.ui.pointerX, this.ui.pointerY)
    }

    /** Build the guide again, the place read kept. */
    public refresh(): void {
        const { theme, ui } = this
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        const offset = this.#scroll.offset
        // Taken out of the column of the last layout, since a component has one parent.
        this.#scroll.parent?.remove(this.#scroll)
        this.#back.parent?.remove(this.#back)
        this.#detail.parent?.remove(this.#detail)
        const look = { theme, hearLink: this.#detail.hearLink }
        const text = new Box("column", { gap: BLOCK_GAP, align: "stretch", padding: MARGIN })
        for(const block of this.blocks) text.add(block(look))
        this.#scroll.content = text
        const backdrop = new Panel(theme, {
            background: NineSlice.flat(theme.white, BACKDROP), padding: 0, interactive: false,
        })
        content.add(backdrop, { x: "stretch", y: "stretch" })
        const inner = new Box("column", { gap: MARGIN, align: "stretch" })
        inner.add(new Label(theme, "Guide", { color: CHOSEN_TEXT, align: "center" }))
        inner.add(this.#scroll, { grow: 1 })
        inner.add(this.#back, { align: "center" })
        const panel = new Panel(theme, { padding: MARGIN })
        panel.fixedSize = {
            width: Math.min(MAX_WIDTH, ui.width - 2 * MARGIN),
            height: ui.height - 3 * MARGIN - DETAIL_HEIGHT,
        }
        panel.content = inner
        this.#detail.hint = "Survole une carte, un cœur ou un mot en couleur pour le lire."
        this.#detail.fixedSize = { width: ui.width - 2 * MARGIN, height: DETAIL_HEIGHT }
        const root = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        root.fixedSize = { width: ui.width, height: ui.height }
        root.add(panel, { align: "center" })
        root.add(this.#detail)
        content.add(root, { x: "start", y: "start" })
        this.#scroll.offset = offset
    }


    readonly #layer: Layer
    readonly #scroll: Scroll
    readonly #back: Button
    readonly #detail: DetailBox

    /** What the box was last told, none when the pointer was over nothing it explains. */
    #last: Text|null = null

    /** The size of the interface it was laid out for, none before the first frame. */
    #size = ""

    /** What the card or the heart under the pointer says, none when the pointer is over neither. */
    #textUnderPointer(): Text|null {
        for(let each: Component|null = this.ui.hovered; each; each = each.parent){
            if(each instanceof CardView && each.card) return concat(each.card, " : ", each.card.description)
            if(each instanceof HeartView) return heartText(each.heart)
        }
        return null
    }
}
