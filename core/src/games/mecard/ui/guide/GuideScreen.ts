import type { Sprite } from "../../../../engine/gpu"
import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel, Scroll } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"

import { Detail } from "../hud/Detail"
import { DetailTooltip } from "../hud/DetailTooltip"
import { viewDetails } from "../hud/viewDetails"
import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"
import { GUIDE } from "./guide"
import type { GuideBlock } from "./GuideBlocks"

/** The color behind the guide. */
const BACKDROP = new Color(0.1, 0.06, 0.03)

/** The space around the guide and between its parts, in virtual pixels. */
const MARGIN = 4

/** The widest the text of the guide is, in virtual pixels: a longer line is tiring to read. */
const MAX_WIDTH = 320

/** The space between two blocks of the guide, in virtual pixels. */
const BLOCK_GAP = 6

/** The size the scroll asks for: it takes whatever room its panel gives it. */
const SCROLL_SIZE = 40

/** What the guide asks of its game. */
export interface GuideHost {
    /** Leave the guide, back to the main menu. */
    leave(): void
}

/**
 * The guide: a long text that scrolls, with the cards and the hearts it speaks of drawn inside it, a button
 * back to the menu. A bubble says what the pointer is over: a card or a heart drawn, or an object or a keyword
 * named in the text.
 */
export class GuideScreen {


    /** Is the guide shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        if(visible === this.visible) return
        this.#layer.content.visible = visible
        this.#tipLayer.content.visible = visible
        if(visible){
            this.#scroll.offset = 0
            this.#size = ""
        }
    }

    /** What scrolls the text. */
    public get scroll(): Scroll { return this.#scroll }

    /** The button back to the menu. */
    public get backButton(): Button { return this.#back }

    /** The bubbles that say what is hovered. */
    public get tooltip(): DetailTooltip { return this.#tooltip }

    constructor(
        public readonly theme: Theme,

        /** The interface the guide lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: GuideHost,

        /** What the guide is made of, in the order it is read: the guide of the game by default. */
        public readonly blocks: readonly GuideBlock[] = GUIDE,

        /** The worn paper the bubbles of the guide are framed with, none until it is loaded. */
        paper: () => Sprite|null = () => null,
    ){
        this.#layer = ui.addLayer("guide")
        this.#layer.content.visible = false
        this.#tipLayer = ui.addLayer("guide-tooltip")
        this.#tipLayer.content.visible = false
        this.#tooltip = new DetailTooltip(ui, this.#tipLayer, theme, { color: DIM_TEXT, paper })
        this.#scroll = new Scroll(theme, { width: SCROLL_SIZE, height: SCROLL_SIZE })
        this.#back = new Button(theme, "Retour")
        this.#back.onActivate = () => host.leave()
    }


    /** Lay the guide out again when the interface changed size, and let the bubbles read the input. */
    public frame(input: InputFrame): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size !== this.#size){
            this.#size = size
            this.refresh()
        }
        this.#tooltip.frame(input)
    }

    /** Build the guide again, the place read kept. */
    public refresh(): void {
        const { theme, ui } = this
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        this.#hovers?.remove()
        this.#hovers = null
        this.#tooltip.reset()
        const offset = this.#scroll.offset
        // Taken out of the column of the last layout, since a component has one parent.
        this.#scroll.parent?.remove(this.#scroll)
        this.#back.parent?.remove(this.#back)
        const look = { theme, hearLink: this.#tooltip.hearLink }
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
            height: ui.height - 2 * MARGIN,
        }
        panel.content = inner
        const root = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        root.fixedSize = { width: ui.width, height: ui.height }
        root.add(panel, { align: "center" })
        content.add(root, { x: "start", y: "start" })
        this.#scroll.offset = offset
        // DETAILS //
        const hovers = Detail.all(...viewDetails(text))
        this.#tooltip.attach(hovers)
        this.#hovers = hovers
    }


    readonly #layer: Layer

    /** The layer over the guide that the bubbles open in. */
    readonly #tipLayer: Layer

    /** The bubbles that say what is hovered. */
    readonly #tooltip: DetailTooltip
    readonly #scroll: Scroll
    readonly #back: Button

    /** What the cards and hearts of the guide tell, until it is built again. */
    #hovers: Detail|null = null

    /** The size of the interface it was laid out for, none before the first frame. */
    #size = ""
}
