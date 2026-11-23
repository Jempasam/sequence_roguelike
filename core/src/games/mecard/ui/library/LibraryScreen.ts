import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import { Bar, Box, Button, Label, NineSlice, Panel, Scroll, TextInput, WrapBox } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"
import { plainText } from "../../../../semantic"

import type { PlayerCatalog } from "../../persist/PlayerCatalog"
import { Detail } from "../hud/Detail"
import { DetailTooltip } from "../hud/DetailTooltip"
import { viewDetails } from "../hud/viewDetails"
import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"
import { FRAME_THICKNESS } from "../look/wood"
import type { UnitSprites } from "../look/UnitSprites"
import { sections } from "./entries"
import type { Section } from "./entries"

/** The color behind the catalogue. */
const BACKDROP = new Color(0.1, 0.06, 0.03)

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** The height of the bar between two categories of tabs, about a tab's. */
const BAR_HEIGHT = 14

/** How wide a card of an entry is, the space between two, and the frame around the cards of an entry. */
const CARD_WIDTH = 44
const CARD_GAP = 2
const ENTRY_FRAME = 16

/** How wide the search field is, in virtual pixels. */
const SEARCH_WIDTH = 80

/** A text in lower case without accents, to compare what is typed with what is written. */
function simplified(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

/** What the catalogue hears from the game. */
export interface LibraryHost {
    /** Leave the catalogue, back to the journey. */
    leave(): void
}

/**
 * The catalogue: a title, tabs, and the entries of the tab chosen in lines, centered, that scroll. A bubble
 * says what the pointer hovers.
 */
export class LibraryScreen {


    constructor(
        public readonly theme: Theme,

        /** The interface the catalogue lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: LibraryHost,

        /** The pictures of the units, which the entries of characters and monsters show. */
        sprites: UnitSprites,

        /** What the player found, none for a catalogue that cannot tell. */
        public readonly catalog: PlayerCatalog|null = null,
    ){
        this.#sprites = sprites
        this.#layer = ui.addLayer("library")
        this.#layer.content.visible = false
        this.#tipLayer = ui.addLayer("library-tooltip")
        this.#tipLayer.content.visible = false
        this.#tooltip = new DetailTooltip(ui, this.#tipLayer, theme, {
            color: DIM_TEXT, paper: () => sprites.paper,
        })
        this.#sections = sections({
            theme, sprites,
            perRow: () => Math.max(1, Math.floor((ui.width - 2 * MARGIN - ENTRY_FRAME + CARD_GAP) / (CARD_WIDTH + CARD_GAP))),
        })
        // The field lives as long as the catalogue, so it keeps the focus while the list is made again.
        this.#search = new TextInput(theme, { maxLength: 40 })
        this.#search.onChange = text => {
            this.#query = simplified(text)
            this.#refreshList()
        }
        this.#count = new Label(theme, "", { color: DIM_TEXT })
        this.#listSlot = new Box("column", { align: "stretch" })
        catalog?.changed.add(() => { if(this.visible && this.#playerOnly) this.#refreshList() })
    }


    /** Does the catalogue list only what the player found? */
    public get playerOnly(): boolean { return this.#playerOnly }

    public set playerOnly(only: boolean){
        const wanted = only && this.catalog !== null
        if(wanted === this.#playerOnly) return
        this.#playerOnly = wanted
        if(this.visible) this.#build()
    }


    /** Is the catalogue shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        if(visible === this.visible) return
        this.#layer.content.visible = visible
        this.#tipLayer.content.visible = visible
        if(visible) this.#size = ""
    }

    /** The index of the tab shown. */
    public get selected(): number { return this.#selected }

    public set selected(index: number){
        if(index < 0 || index >= this.#sections.length || index === this.#selected) return
        this.#selected = index
        // The tabs are the same: only which one is chosen and the entries change.
        if(this.#tabButtons.length === 0) return
        this.#styleTabs()
        if(this.#listScroll) this.#listScroll.offset = 0
        this.#refreshList()
    }

    /** The titles of the tabs. */
    public get titles(): string[] { return this.#sections.map(section => section.title) }

    /** The bubbles that say what is hovered. */
    public get tooltip(): DetailTooltip { return this.#tooltip }

    /** Lay the panels out again when the interface changed size, and let the bubbles read the input. */
    public frame(input: InputFrame): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size !== this.#size){
            this.#size = size
            this.#build()
        }
        this.#tooltip.frame(input)
    }


    /** What the entries of the list tell, and the cards and icons they hold. */
    #hovers: Detail|null = null

    readonly #layer: Layer

    /** The layer over the catalogue that the bubbles open in. */
    readonly #tipLayer: Layer

    /** The bubbles that say what is hovered. */
    readonly #tooltip: DetailTooltip
    readonly #sections: readonly Section[]
    readonly #search: TextInput
    /** How many entries the list shows, beside the search field. */
    readonly #count: Label
    readonly #listSlot: Box
    readonly #sprites: UnitSprites
    /** The buttons of the tabs, in the order of the sections, empty until the tabs are built. */
    #tabButtons: Button[] = []
    /** The scroll of the entries, kept so a new list does not lose how far it was scrolled. */
    #listScroll: Scroll|null = null
    #playerOnly = false
    #query = ""
    #selected = 0
    #size = ""

    /** Build the panels again: the backdrop, then the title, the tabs, the entries and the details. */
    #build(): void {
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        this.#search.parent?.remove(this.#search)
        this.#count.parent?.remove(this.#count)
        this.#listSlot.parent?.remove(this.#listSlot)
        const backdrop = new Panel(this.theme, {
            background: NineSlice.flat(this.theme.white, BACKDROP), padding: 0, interactive: false,
        })
        content.add(backdrop, { x: "stretch", y: "stretch" })
        const column = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        const title = new Label(this.theme, "Catalogue", { color: CHOSEN_TEXT })
        const leave = new Button(this.theme, "Retour")
        leave.onActivate = () => this.host.leave()
        const head = new Box("row", { gap: MARGIN, align: "center" })
        const wood = this.#sprites.wood
        const pad = wood ? FRAME_THICKNESS + 1 : this.theme.panel.padding
        this.#search.fixedSize = { width: SEARCH_WIDTH, height: this.#search.measure(Infinity).preferredHeight }
        // The title and the button sit in sides of the same width, so the field is in the middle.
        const side = Math.max(title.measure(Infinity).preferredWidth, leave.measure(Infinity).preferredWidth)
        const height = Math.max(title.measure(Infinity).preferredHeight, leave.measure(Infinity).preferredHeight)
        const left = new Box("row", { align: "center" })
        left.add(title)
        left.fixedSize = { width: side, height }
        const right = new Box("row", { align: "center" })
        right.add(new Box("row"), { grow: 1 })
        right.add(leave)
        right.fixedSize = { width: side, height }
        head.add(left)
        head.add(new Box("row"), { grow: 1 })
        head.add(this.#search)
        head.add(this.#count)
        head.add(new Box("row"), { grow: 1 })
        head.add(right)
        // The header sits in the wood of the frames of the journey and the battle.
        // It holds the buttons too: the row of tabs sits under the title and the search.
        const top = new Box("column", { gap: MARGIN, align: "stretch" })
        top.add(head)
        top.add(this.#tabs())
        const header = new Panel(this.theme, wood ? { background: wood.frame, padding: pad } : {})
        header.content = top
        column.add(header)
        this.#refreshList()
        column.add(this.#listSlot, { grow: 1 })
        content.add(column, { x: "stretch", y: "stretch" })
    }

    /** The row of tabs, in a scroll that carries it sideways when it is too long. */
    #tabs(): Scroll {
        // A wrapping box, so the tabs sit in the middle when they fit, and scroll when they do not.
        const row = new WrapBox({ gap: 2 })
        this.#tabButtons = []
        this.#sections.forEach((section, index) => {
            if(index > 0 && section.group !== this.#sections[index - 1].group){
                // A thin bar as high as a tab marks where a category ends.
                row.add(new Bar(2, BAR_HEIGHT))
            }
            const tab = new Button(this.theme, section.title)
            tab.onActivate = () => { this.selected = index }
            this.#tabButtons.push(tab)
            row.add(tab)
        })
        this.#styleTabs()
        const height = row.measure(Infinity).preferredHeight + this.theme.scrollbar.width
        // As wide as what the wood of the header leaves.
        const pad = this.#sprites.wood ? FRAME_THICKNESS + 1 : this.theme.panel.padding
        const width = this.ui.width - 2 * MARGIN - 2 * pad
        const scroll = new Scroll(this.theme, { axis: "horizontal", width, height, wheel: true })
        scroll.content = row
        return scroll
    }

    /** Show the chosen tab as pressed, the others as normal buttons. */
    #styleTabs(): void {
        const button = this.theme.button
        const pressed = button.pressed
        const chosenLooks = { ...button, normal: pressed, hovered: pressed, focused: pressed }
        this.#tabButtons.forEach((tab, index) => {
            tab.looks = index === this.#selected ? chosenLooks : button
        })
    }

    /** Put the entries that match the search in the scroll of the list, in place of the old ones. */
    #refreshList(): void {
        const scroll = this.#list()
        if(scroll.parent !== this.#listSlot) this.#listSlot.add(scroll, { grow: 1 })
    }

    /** The entries of the tab chosen that match the search, in lines, in a scroll. */
    #list(): Scroll {
        const wrap = new WrapBox({ gap: MARGIN })
        this.#hovers?.remove()
        this.#hovers = null
        const section = this.#sections[this.#selected]
        const all = section.entries()
        // The player's catalogue hides what the player did not find, and tells how much of the whole is shown.
        const seen = this.#playerOnly && this.catalog
            ? all.filter(entry => this.catalog!.has(section.category, entry.key))
            : all
        const entries = seen.filter(entry => {
            return this.#query === "" || simplified(plainText(entry.search ?? entry.text)).includes(this.#query)
        })
        this.#count.text = this.#playerOnly ? `${entries.length}/${all.length}` : `${entries.length}`
        const details: Detail[] = []
        for(const entry of entries){
            const holder = new Panel(this.theme, { background: null, padding: 0, interactive: false })
            holder.content = entry.view
            details.push(Detail.on(holder, entry.text, viewDetails(entry.view)))
            wrap.add(holder)
        }
        const hovers = Detail.all(...details)
        this.#tooltip.reset()
        this.#tooltip.attach(hovers)
        this.#hovers = hovers
        const scroll = this.#listScroll ??= new Scroll(this.theme, { width: this.ui.width, height: 1 })
        scroll.resize(this.ui.width, 1)
        scroll.content = wrap
        return scroll
    }
}
