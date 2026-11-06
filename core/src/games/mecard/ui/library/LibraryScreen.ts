import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel, Scroll, WrapBox } from "../../../../engine/ui"
import type { Component, Layer, Theme, UiRoot } from "../../../../engine/ui"
import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import type { Card } from "../../sim/card/Card"

import { DetailBox } from "../hud/DetailBox"
import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"
import { sections } from "./entries"
import type { Section } from "./entries"

/** The color behind the catalogue. */
const BACKDROP = new Color(0.12, 0.11, 0.17)

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** How wide a card of an entry is, the space between two, and the frame around the cards of an entry. */
const CARD_WIDTH = 44
const CARD_GAP = 2
const ENTRY_FRAME = 16

/** How tall the box of details is, in virtual pixels. */
const DETAIL_HEIGHT = 44

/** What the catalogue hears from the game. */
export interface LibraryHost {
    /** Leave the catalogue, back to the journey. */
    leave(): void
}

/**
 * The catalogue: a title, tabs, the entries of the tab chosen in lines, centered, that scroll, and under
 * them a box that says what the pointer hovers.
 */
export class LibraryScreen {


    constructor(
        public readonly theme: Theme,

        /** The interface the catalogue lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: LibraryHost,

        /** The pictures of the units, which the entries of characters and monsters show. */
        sprites: UnitSprites,
    ){
        this.#layer = ui.addLayer("library")
        this.#layer.content.visible = false
        this.#sections = sections({
            theme, sprites,
            perRow: () => Math.max(1, Math.floor((ui.width - 2 * MARGIN - ENTRY_FRAME + CARD_GAP) / (CARD_WIDTH + CARD_GAP))),
            onCard: (card, over) => {
                if(over) this.#card = card
                else if(this.#card === card) this.#card = null
            },
        })
        this.#detail = new DetailBox(theme, { color: DIM_TEXT, scrolled: true })
    }


    /** Is the catalogue shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        if(visible === this.visible) return
        this.#layer.content.visible = visible
        if(visible) this.#size = ""
    }

    /** The index of the tab shown. */
    public get selected(): number { return this.#selected }

    public set selected(index: number){
        if(index < 0 || index >= this.#sections.length || index === this.#selected) return
        this.#selected = index
        this.#build()
    }

    /** The titles of the tabs. */
    public get titles(): string[] { return this.#sections.map(section => section.title) }

    /** The box that says what is hovered. */
    public get detail(): DetailBox { return this.#detail }

    /** Lay the panels out again when the interface changed size, and let the box of details read the input. */
    public frame(input: InputFrame): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size !== this.#size){
            this.#size = size
            this.#build()
        }
        this.#detail.tell(this.#textUnderPointer())
        this.#detail.frame(input, this.ui.pointerX, this.ui.pointerY)
    }


    /** The card of an entry the pointer is over, none when it is over none. */
    #card: Card|null = null

    /** What each entry says, by the component that holds it in the list. */
    readonly #told = new Map<Component, Text>()

    /** What the entry under the pointer says, none when the pointer is over no entry. */
    #textUnderPointer(): Text|null {
        // A card of an entry, when the pointer is over one, says more than the entry.
        if(this.#card) return concat(this.#card, " : ", this.#card.description)
        for(let each: Component|null = this.ui.hovered; each; each = each.parent){
            const text = this.#told.get(each)
            if(text !== undefined) return text
        }
        return null
    }

    readonly #layer: Layer
    readonly #sections: readonly Section[]
    readonly #detail: DetailBox
    #selected = 0
    #size = ""

    /** Build the panels again: the backdrop, then the title, the tabs, the entries and the details. */
    #build(): void {
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        this.#detail.parent?.remove(this.#detail)
        const backdrop = new Panel(this.theme, {
            background: NineSlice.flat(this.theme.white, BACKDROP), padding: 0, interactive: false,
        })
        content.add(backdrop, { x: "stretch", y: "stretch" })
        const column = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        const title = new Label(this.theme, "Catalogue", { color: CHOSEN_TEXT })
        const leave = new Button(this.theme, "Retour")
        leave.onActivate = () => this.host.leave()
        const head = new Box("row", { gap: MARGIN, align: "center" })
        head.add(title, { grow: 1 })
        head.add(leave)
        column.add(head)
        column.add(this.#tabs())
        column.add(this.#list(), { grow: 1 })
        const detail = this.#detail
        detail.hint = "Survole un élément pour le lire."
        detail.fixedSize = { width: this.ui.width - 2 * MARGIN, height: DETAIL_HEIGHT }
        column.add(detail)
        content.add(column, { x: "stretch", y: "stretch" })
    }

    /** The row of tabs, in a scroll that carries it sideways when it is too long. */
    #tabs(): Scroll {
        const button = this.theme.button
        const pressed = button.pressed
        const chosenLooks = { ...button, normal: pressed, hovered: pressed, focused: pressed }
        // A wrapping box, so the tabs sit in the middle when they fit, and scroll when they do not.
        const row = new WrapBox({ gap: 2 })
        this.#sections.forEach((section, index) => {
            const tab = new Button(this.theme, section.title, index === this.#selected ? { looks: chosenLooks } : {})
            tab.onActivate = () => { this.selected = index }
            row.add(tab)
        })
        const height = row.measure(Infinity).preferredHeight + this.theme.scrollbar.width
        const scroll = new Scroll(this.theme, { axis: "horizontal", width: this.ui.width, height, wheel: true })
        scroll.content = row
        return scroll
    }

    /** The entries of the tab chosen, in lines, in a scroll. */
    #list(): Scroll {
        const wrap = new WrapBox({ gap: MARGIN })
        this.#told.clear()
        // The cards of the old list are gone, and their pointer leaving will never be heard.
        this.#card = null
        for(const entry of this.#sections[this.#selected].entries()){
            const holder = new Panel(this.theme, { background: null, padding: 0, interactive: false })
            holder.content = entry.view
            this.#told.set(holder, entry.text)
            wrap.add(holder)
        }
        const scroll = new Scroll(this.theme, { width: this.ui.width, height: 1 })
        scroll.content = wrap
        return scroll
    }
}
